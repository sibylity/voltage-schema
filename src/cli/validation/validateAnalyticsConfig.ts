import path from "path";
import type { ErrorObject } from "ajv";
import { type AnalyticsConfig } from "../../types";
import { type ValidationResult, type ValidationContext } from "./types";
import { createValidator } from "./schemaValidation";
import { parseJsonFile } from "./fileValidation";
import { logValidationStart, logValidationSuccess, logValidationErrors } from "./logging";

const validateConfigSchema = createValidator(path.resolve(__dirname, "../../schemas/analytics.config.schema.json"));
const validateGroupsSchema = createValidator(path.resolve(__dirname, "../../schemas/analytics.groups.schema.json"));
const validateDimensionsSchema = createValidator(path.resolve(__dirname, "../../schemas/analytics.dimensions.schema.json"));

export function validateAnalyticsConfig(
  configPath: string,
  context: ValidationContext
): ValidationResult<AnalyticsConfig> {
  logValidationStart(context);
  const result = parseJsonFile<AnalyticsConfig>(configPath);
  if (!result.isValid || !result.data) {
    logValidationErrors(result.errors || []);
    return result;
  }

  const isValid = validateConfigSchema(result.data);
  if (!isValid) {
    const errors = validateConfigSchema.errors?.map((error: ErrorObject) =>
      `Invalid analytics config: ${error.message || "Unknown error"}`
    ) || [];
    logValidationErrors(errors);
    return { isValid: false, errors };
  }

  // Validate each generation config entry
  for (const genConfig of result.data.generates) {
    // Validate groups if present
    if (genConfig.groups) {
      for (const groupFile of genConfig.groups) {
        const groupResult = parseJsonFile(groupFile);
        if (!groupResult.isValid) {
          logValidationErrors(groupResult.errors || []);
          return { isValid: false, errors: groupResult.errors };
        }

        const isGroupValid = validateGroupsSchema(groupResult.data);
        if (!isGroupValid) {
          const errors = validateGroupsSchema.errors?.map((error: ErrorObject) =>
            `Invalid groups file ${groupFile}: ${error.message || "Unknown error"}`
          ) || [];
          logValidationErrors(errors);
          return { isValid: false, errors };
        }
      }
    }

    // Validate dimensions if present
    if (genConfig.dimensions) {
      for (const dimensionFile of genConfig.dimensions) {
        const dimensionResult = parseJsonFile(dimensionFile);
        if (!dimensionResult.isValid) {
          logValidationErrors(dimensionResult.errors || []);
          return { isValid: false, errors: dimensionResult.errors };
        }

        const isDimensionValid = validateDimensionsSchema(dimensionResult.data);
        if (!isDimensionValid) {
          const errors = validateDimensionsSchema.errors?.map((error: ErrorObject) =>
            `Invalid dimensions file ${dimensionFile}: ${error.message || "Unknown error"}`
          ) || [];
          logValidationErrors(errors);
          return { isValid: false, errors };
        }
      }
    }
  }

  logValidationSuccess(context);
  return result;
} 