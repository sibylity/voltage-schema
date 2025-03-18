import path from "path";
import { type AnalyticsConfig } from "../../types";
import { type ValidationResult, type ValidationContext } from "./types";
import { createValidator } from "./schemaValidation";
import { parseJsonFile } from "./fileValidation";
import { logValidationStart, logValidationSuccess, logValidationErrors } from "./logging";
import type { ErrorObject } from "ajv";

const validateConfigSchema = createValidator(path.resolve(__dirname, "../../schemas/analytics.config.schema.json"));

export function validateAnalyticsConfig(
  configPath: string,
  context: ValidationContext
): ValidationResult<AnalyticsConfig> {
  logValidationStart(context);
  const result = parseJsonFile<AnalyticsConfig>(configPath);
  if (!result.isValid) {
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

  logValidationSuccess(context);
  return result;
} 