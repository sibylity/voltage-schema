import fs from "fs";
import path from "path";
import type { ErrorObject } from "ajv";
import { type AnalyticsGlobals, type Dimension, type DimensionIdentifier, type Group, type Property } from "../../types";
import { type ValidationResult, type ValidationContext } from "./types";
import { createValidator } from "./schemaValidation";
import { parseJsonFile } from "./fileValidation";
import { logValidationStart, logValidationSuccess, logValidationErrors } from "./logging";

const validateGroupsSchema = createValidator(path.resolve(__dirname, "../../schemas/analytics.groups.schema.json"));

// Default empty groups when file is not provided
export const defaultGroups: AnalyticsGlobals = {
  groups: [],
  dimensions: []
};

function validateGroupDimensions(dimensions: Dimension[], groups: Group[], events: Record<string, any>): ValidationResult<void> {
  const errors: string[] = [];
  
  // Create a map of group names to their properties
  const groupProperties = new Map<string, Set<string>>();
  groups.forEach(group => {
    const properties = new Set(group.properties.map(prop => prop.name));
    groupProperties.set(group.name, properties);
  });

  // Validate each dimension
  dimensions.forEach(dimension => {
    dimension.identifiers.forEach(identifier => {
      // Check that the group exists
      if (!groupProperties.has(identifier.group)) {
        errors.push(`Dimension "${dimension.name}" references non-existent group "${identifier.group}"`);
        return;
      }

      // Check that the property exists on the specified group
      const properties = groupProperties.get(identifier.group)!;
      if (!properties.has(identifier.property)) {
        errors.push(`Dimension "${dimension.name}" references property "${identifier.property}" which does not exist on group "${identifier.group}"`);
      }
    });
  });

  return errors.length > 0 ? { isValid: false, errors } : { isValid: true };
}

function validateGroupIdentifiedBy(group: { name: string; properties: Array<{ name: string; optional?: boolean }>; identifiedBy?: string }): ValidationResult<void> {
  const errors: string[] = [];

  if (group.identifiedBy) {
    const propertyExists = group.properties.some(prop => prop.name === group.identifiedBy);
    if (!propertyExists) {
      errors.push(`Group "${group.name}" has identifiedBy "${group.identifiedBy}" but this property does not exist in the group's properties`);
    } else {
      // Check if the identifiedBy property is marked as optional
      const identifiedByProperty = group.properties.find(prop => prop.name === group.identifiedBy);
      if (identifiedByProperty?.optional) {
        errors.push(`Group "${group.name}" has identifiedBy "${group.identifiedBy}" but this property is marked as optional. The identifiedBy property is always required.`);
      }
    }
  }

  return errors.length > 0 ? { isValid: false, errors } : { isValid: true };
}

export function validateGroups(groupsPath: string, eventsPath: string): ValidationResult<AnalyticsGlobals> {
  const context = { filePath: groupsPath };
  logValidationStart(context);
  
  // If groups file doesn't exist, use defaults
  if (!fs.existsSync(groupsPath)) {
    console.log(`ℹ️ No groups file found at ${groupsPath}, using default empty values.`);
    return { isValid: true, data: defaultGroups };
  }

  // Parse groups file
  const parseResult = parseJsonFile<AnalyticsGlobals>(groupsPath);
  if (!parseResult.isValid || !parseResult.data) {
    if (parseResult.errors) {
      logValidationErrors(parseResult.errors);
    }
    return { isValid: false, data: defaultGroups };
  }

  const groups = parseResult.data;

  // Parse events file
  let events = {};
  if (fs.existsSync(eventsPath)) {
    const eventsParseResult = parseJsonFile<Record<string, any>>(eventsPath);
    if (eventsParseResult.isValid && eventsParseResult.data) {
      events = eventsParseResult.data;
    }
  }

  // Validate groups schema
  if (!validateGroupsSchema(groups)) {
    const errors = validateGroupsSchema.errors?.map((error: ErrorObject) => 
      `Groups schema validation failed: ${error.message || "Unknown error"} at ${error.instancePath}`
    ) || ["Unknown schema validation error"];
    logValidationErrors(errors);
    return { isValid: false, data: groups, errors };
  }

  console.log(`✅ Validating group dimensions for ${groupsPath}...`);
  const dimensionsResult = validateGroupDimensions(groups.dimensions, groups.groups, events);

  const errors: string[] = [];
  if (!dimensionsResult.isValid && dimensionsResult.errors) {
    errors.push(...dimensionsResult.errors);
  }

  // Validate each group's identifiedBy field
  groups.groups.forEach(group => {
    console.log(`🔍 Validating group: ${group.name}`);
    const identifiedByResult = validateGroupIdentifiedBy(group);
    if (!identifiedByResult.isValid && identifiedByResult.errors) {
      errors.push(...identifiedByResult.errors);
    }
  });

  if (errors.length > 0) {
    logValidationErrors(errors);
    return { isValid: false, data: groups, errors };
  }

  logValidationSuccess(context);
  return { isValid: true, data: groups };
} 