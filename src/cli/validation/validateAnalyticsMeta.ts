import path from "path";
import { type ValidationResult } from "./types";
import { createValidator } from "./schemaValidation";
import { parseSchemaFile } from "./fileValidation";
import { logValidationErrors } from "./logging";
import { type AnalyticsSchemaMetaRule } from "../../types";

const validateMetaSchema = createValidator(path.resolve(__dirname, "../../schemas/analytics.meta.schema.json"));

function validateMetaRuleNames(metaRules: AnalyticsSchemaMetaRule[]): ValidationResult<void> {
  const errors: string[] = [];
  const ruleNames = new Set<string>();

  metaRules.forEach((rule) => {
    if (ruleNames.has(rule.name)) {
      errors.push(`Duplicate meta rule name "${rule.name}" found in meta file.`);
    } else {
      ruleNames.add(rule.name);
    }
  });

  return errors.length > 0 ? { isValid: false, errors } : { isValid: true };
}

export function validateMeta(
  metaPath: string
): ValidationResult<{ meta: AnalyticsSchemaMetaRule[] }> {
  const result = parseSchemaFile<{ meta: AnalyticsSchemaMetaRule[] }>(metaPath);
  if (!result.isValid || !result.data) {
    logValidationErrors(result.errors || []);
    return result;
  }

  const isValid = validateMetaSchema(result.data);
  if (!isValid) {
    const errors = validateMetaSchema.errors?.map((error) =>
      `Invalid meta file ${metaPath}: ${error.message || "Unknown error"}`
    ) || [];
    logValidationErrors(errors);
    return { isValid: false, errors };
  }

  // Check for duplicate meta rule names
  const namesResult = validateMetaRuleNames(result.data.meta);
  if (!namesResult.isValid && namesResult.errors) {
    logValidationErrors(namesResult.errors);
    return { isValid: false, errors: namesResult.errors };
  }

  return result;
}
