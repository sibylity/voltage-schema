import fs from "fs";
import path from "path";
import type { ErrorObject } from "ajv";
import { type AnalyticsGlobals, type Dimension, type DimensionIdentifier, type Group, type Property } from "../../types";
import { type ValidationResult, type ValidationContext } from "./types";
import { createValidator } from "./schemaValidation";
import { parseJsonFile } from "./fileValidation";
import { logValidationStart, logValidationSuccess, logValidationErrors } from "./logging";

const validateGlobalsSchema = createValidator(path.resolve(__dirname, "../../schemas/analytics.globals.schema.json"));

// Default empty globals when file is not provided
export const defaultGlobals: AnalyticsGlobals = {
  groups: [],
  dimensions: []
};

function validateGlobalDimensions(dimensions: Dimension[], groups: Group[], events: Record<string, any>): ValidationResult<void> {
  const errors: string[] = [];

  // Create sets of all valid property names from groups and events
  const groupPropertyNames = new Set<string>();
  groups.forEach(group => {
    group.properties.forEach((prop: Property) => {
      groupPropertyNames.add(prop.name);
    });
  });

  const eventPropertyNames = new Set<string>();
  Object.values(events).forEach(event => {
    if (event.properties) {
      event.properties.forEach((prop: Property) => {
        eventPropertyNames.add(prop.name);
      });
    }
  });

  dimensions.forEach((dimension: Dimension) => {
    if (!dimension.name) {
      errors.push("Dimension name is required");
      return;
    }

    if (!dimension.description) {
      errors.push(`Dimension "${dimension.name}" description is required`);
      return;
    }

    if (!dimension.identifiers || !Array.isArray(dimension.identifiers)) {
      errors.push(`Dimension "${dimension.name}" identifiers must be an array`);
      return;
    }

    dimension.identifiers.forEach((identifier: DimensionIdentifier, index: number) => {
      if (!identifier.property) {
        errors.push(`Dimension "${dimension.name}" identifier at index ${index} must have a property`);
        return;
      }

      // Check if the property exists in either groups or events
      if (!groupPropertyNames.has(identifier.property) && !eventPropertyNames.has(identifier.property)) {
        errors.push(
          `Dimension "${dimension.name}" identifier at index ${index} references property "${identifier.property}" which does not exist in any group or event`
        );
        return;
      }

      // Validate that only one identifier type is used
      const identifierTypes = [
        identifier.contains,
        identifier.equals,
        identifier.not,
        identifier.in,
        identifier.notIn,
        identifier.startsWith,
        identifier.endsWith,
        identifier.lt,
        identifier.lte,
        identifier.gt,
        identifier.gte
      ].filter(Boolean);

      if (identifierTypes.length > 1) {
        errors.push(
          `Dimension "${dimension.name}" identifier at index ${index} can only have one type of identifier`
        );
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

export function validateGlobals(globalsPath: string, eventsPath: string): ValidationResult<AnalyticsGlobals> {
  const context = { filePath: globalsPath };
  logValidationStart(context);
  
  // If globals file doesn't exist, use defaults
  if (!fs.existsSync(globalsPath)) {
    console.log(`ℹ️ No globals file found at ${globalsPath}, using default empty values.`);
    return { isValid: true, data: defaultGlobals };
  }

  // Parse globals file
  const parseResult = parseJsonFile<AnalyticsGlobals>(globalsPath);
  if (!parseResult.isValid || !parseResult.data) {
    if (parseResult.errors) {
      logValidationErrors(parseResult.errors);
    }
    return { isValid: false, data: defaultGlobals };
  }

  const globals = parseResult.data;

  // Parse events file
  let events = {};
  if (fs.existsSync(eventsPath)) {
    const eventsParseResult = parseJsonFile<Record<string, any>>(eventsPath);
    if (eventsParseResult.isValid && eventsParseResult.data) {
      events = eventsParseResult.data;
    }
  }

  // Validate globals schema
  if (!validateGlobalsSchema(globals)) {
    const errors = validateGlobalsSchema.errors?.map((error: ErrorObject) => 
      `Globals schema validation failed: ${error.message || "Unknown error"} at ${error.instancePath}`
    ) || ["Unknown schema validation error"];
    logValidationErrors(errors);
    return { isValid: false, data: globals, errors };
  }

  console.log(`✅ Validating global dimensions for ${globalsPath}...`);
  const dimensionsResult = validateGlobalDimensions(globals.dimensions, globals.groups, events);

  const errors: string[] = [];
  if (!dimensionsResult.isValid && dimensionsResult.errors) {
    errors.push(...dimensionsResult.errors);
  }

  // Validate each group's identifiedBy field
  globals.groups.forEach(group => {
    console.log(`🔍 Validating group: ${group.name}`);
    const identifiedByResult = validateGroupIdentifiedBy(group);
    if (!identifiedByResult.isValid && identifiedByResult.errors) {
      errors.push(...identifiedByResult.errors);
    }
  });

  if (errors.length > 0) {
    logValidationErrors(errors);
    return { isValid: false, data: globals, errors };
  }

  logValidationSuccess(context);
  return { isValid: true, data: globals };
} 