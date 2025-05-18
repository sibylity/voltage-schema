import fs from "fs";
import path from "path";
import type { ErrorObject } from "ajv";
import { type AnalyticsGlobals, type Dimension, type Group } from "../../types";
import { type ValidationResult } from "./types";
import { createValidator } from "./schemaValidation";
import { parseSchemaFile } from "./fileValidation";
import { logValidationStart, logValidationSuccess, logValidationErrors } from "./logging";

const validateGroupsSchema = createValidator(path.resolve(__dirname, "../../schemas/analytics.groups.schema.json"));

// Default empty groups when file is not provided
export const defaultGroups: AnalyticsGlobals = {
  groups: [],
  dimensions: []
};

function validateGroupDimensions(
  dimensions: Dimension[] = [],
  groups: Group[] = [],
  events: any
): ValidationResult<AnalyticsGlobals> {
  const errors: string[] = [];
  const groupNames = new Set(groups.map(g => g.name));

  dimensions.forEach(dim => {
    if (dim.identifiers) {
      const { AND, OR } = dim.identifiers;
      const identifiers = AND || OR || [];

      identifiers.forEach(identifier => {
        if (!identifier.group || !identifier.property) {
          errors.push(`Dimension "${dim.name}" has an identifier missing required fields (group, property)`);
          return;
        }

        if (!groupNames.has(identifier.group)) {
          errors.push(`Dimension "${dim.name}" references non-existent group "${identifier.group}"`);
        }

        const group = groups.find(g => g.name === identifier.group);
        if (group) {
          const propertyNames = new Set(group.properties.map(p => p.name));
          if (!propertyNames.has(identifier.property)) {
            errors.push(`Dimension "${dim.name}" references non-existent property "${identifier.property}" in group "${identifier.group}"`);
          }
        }
      });
    }
  });

  return errors.length > 0 ? { isValid: false, errors } : { isValid: true, data: { groups, dimensions } };
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

function validateGroupProperties(group: { name: string; properties: Array<{ name: string }> }): ValidationResult<void> {
  const errors: string[] = [];
  const propertyNames = new Set<string>();

  group.properties.forEach((prop) => {
    if (propertyNames.has(prop.name)) {
      errors.push(`Duplicate property name "${prop.name}" found in group "${group.name}".`);
    } else {
      propertyNames.add(prop.name);
    }
  });

  return errors.length > 0 ? { isValid: false, errors } : { isValid: true };
}

export function validateGroups(
  groupsPath: string,
  eventsPath: string
): ValidationResult<AnalyticsGlobals> {
  const context = { filePath: groupsPath };
  logValidationStart(context);

  // If groups file doesn't exist, use defaults
  if (!fs.existsSync(groupsPath)) {
    console.log(`ℹ️ No groups file found at ${groupsPath}, using default empty values.`);
    return { isValid: true, data: defaultGroups };
  }

  // Parse groups file
  const parseResult = parseSchemaFile<AnalyticsGlobals>(groupsPath);
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
    const eventsParseResult = parseSchemaFile(eventsPath);
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

  // Validate each group's identifiedBy field and properties
  groups.groups.forEach(group => {
    console.log(`🔍 Validating group: ${group.name}`);
    const identifiedByResult = validateGroupIdentifiedBy(group);
    if (!identifiedByResult.isValid && identifiedByResult.errors) {
      errors.push(...identifiedByResult.errors);
    }

    const propertiesResult = validateGroupProperties(group);
    if (!propertiesResult.isValid && propertiesResult.errors) {
      errors.push(...propertiesResult.errors);
    }
  });

  if (errors.length > 0) {
    logValidationErrors(errors);
    return { isValid: false, data: groups, errors };
  }

  logValidationSuccess(context);
  return { isValid: true, data: groups };
} 