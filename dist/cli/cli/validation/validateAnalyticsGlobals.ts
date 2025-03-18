import fs from "fs";
import path from "path";
import type { ErrorObject } from "ajv";
import { type AnalyticsGlobals } from "../../types";
import { type ValidationResult, type ValidationContext } from "./types";
import { createValidator } from "./schemaValidation";
import { parseJsonFile } from "./fileValidation";
import { logValidationStart, logValidationSuccess, logValidationErrors } from "./logging";

const validateGlobalsSchema = createValidator(path.resolve(__dirname, "../../schemas/analytics.globals.schema.json"));

// Default empty globals when file is not provided
export const defaultGlobals: AnalyticsGlobals = {
  dimensions: [],
  properties: []
};

function validateGlobalDimensions(dimensions: AnalyticsGlobals["dimensions"]): ValidationResult<void> {
  const errors: string[] = [];

  dimensions.forEach((dimension) => {
    if (!dimension.name) {
      errors.push("A dimension is missing a name.");
      return;
    }

    if (!dimension.identifiers || dimension.identifiers.length === 0) {
      errors.push(`Dimension "${dimension.name}" has no identifiers.`);
      return;
    }

    dimension.identifiers.forEach((identifier, index) => {
      if (!identifier.property) {
        errors.push(`Identifier #${index + 1} in dimension "${dimension.name}" is missing a "property" field.`);
      }

      // Ensure only one evaluation field is set
      const evaluationFields = ["contains", "equals", "not", "in", "notIn", "startsWith", "endsWith", "lt", "lte", "gt", "gte"];
      const activeFields = evaluationFields.filter((field) => field in identifier);

      if (activeFields.length === 0) {
        errors.push(`Identifier for property "${identifier.property}" in dimension "${dimension.name}" is missing an evaluation field.`);
      } else if (activeFields.length > 1) {
        errors.push(`Identifier for property "${identifier.property}" in dimension "${dimension.name}" has multiple evaluation fields (${activeFields.join(", ")}). Only one is allowed.`);
      }
    });
  });

  return errors.length > 0 ? { isValid: false, errors } : { isValid: true };
}

function validateGlobalProperties(properties: AnalyticsGlobals["properties"]): ValidationResult<void> {
  const errors: string[] = [];

  properties.forEach((prop) => {
    if (!prop.name || !prop.type) {
      errors.push(`Global property "${prop.name || "[Unnamed]"}" is missing required fields (name, type).`);
    }
  });

  return errors.length > 0 ? { isValid: false, errors } : { isValid: true };
}

export function validateGlobals(globalsPath: string): ValidationResult<AnalyticsGlobals> {
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

  // Validate globals schema
  if (!validateGlobalsSchema(globals)) {
    const errors = validateGlobalsSchema.errors?.map((error: ErrorObject) => 
      `Globals schema validation failed: ${error.message || "Unknown error"} at ${error.instancePath}`
    ) || ["Unknown schema validation error"];
    logValidationErrors(errors);
    return { isValid: false, data: globals, errors };
  }

  console.log(`✅ Validating global properties for ${globalsPath}...`);
  const propertiesResult = validateGlobalProperties(globals.properties);

  console.log(`✅ Validating global dimensions for ${globalsPath}...`);
  const dimensionsResult = validateGlobalDimensions(globals.dimensions);

  const errors: string[] = [];
  if (!propertiesResult.isValid && propertiesResult.errors) {
    errors.push(...propertiesResult.errors);
  }
  if (!dimensionsResult.isValid && dimensionsResult.errors) {
    errors.push(...dimensionsResult.errors);
  }

  if (errors.length > 0) {
    logValidationErrors(errors);
    return { isValid: false, data: globals, errors };
  }

  logValidationSuccess(context);
  return { isValid: true, data: globals };
} 