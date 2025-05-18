import path from "path";
import { type ValidationResult } from "./types";
import { createValidator } from "./schemaValidation";
import { parseSchemaFile } from "./fileValidation";
import { logValidationErrors } from "./logging";
import { type AnalyticsSchemaDimension } from "../../types";

const validateDimensionsSchema = createValidator(path.resolve(__dirname, "../../schemas/analytics.dimensions.schema.json"));

function validateDimensionNames(dimensions: Array<{ name: string }>): ValidationResult<void> {
  const errors: string[] = [];
  const dimensionNames = new Set<string>();

  dimensions.forEach((dim) => {
    if (dimensionNames.has(dim.name)) {
      errors.push(`Duplicate dimension name "${dim.name}" found in dimensions file.`);
    } else {
      dimensionNames.add(dim.name);
    }
  });

  return errors.length > 0 ? { isValid: false, errors } : { isValid: true };
}

export function validateDimensions(
  dimensionPath: string,
  eventsPath: string
): ValidationResult<{ dimensions: AnalyticsSchemaDimension[] }> {
  const result = parseSchemaFile<{ dimensions: AnalyticsSchemaDimension[] }>(dimensionPath);
  if (!result.isValid || !result.data) {
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

  // Check for duplicate dimension names
  const namesResult = validateDimensionNames(result.data.dimensions);
  if (!namesResult.isValid && namesResult.errors) {
    logValidationErrors(namesResult.errors);
    return { isValid: false, errors: namesResult.errors };
  }

  return result;
} 