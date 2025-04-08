import path from "path";
import { type ValidationResult } from "./types";
import { createValidator } from "./schemaValidation";
import { parseJsonFile } from "./fileValidation";
import { logValidationErrors } from "./logging";

const validateDimensionsSchema = createValidator(path.resolve(__dirname, "../../schemas/analytics.dimensions.schema.json"));

export function validateDimensions(
  dimensionPath: string,
  eventsPath: string
): ValidationResult<any> {
  const result = parseJsonFile(dimensionPath);
  if (!result.isValid) {
    logValidationErrors(result.errors || []);
    return result;
  }

  const isValid = validateDimensionsSchema(result.data);
  if (!isValid) {
    const errors = validateDimensionsSchema.errors?.map((error) =>
      `Invalid dimensions file ${dimensionPath}: ${error.message || "Unknown error"}`
    ) || [];
    logValidationErrors(errors);
    return { isValid: false, errors };
  }

  return result;
} 