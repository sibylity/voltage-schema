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

function validateMetaRuleDefaultValues(metaRules: AnalyticsSchemaMetaRule[]): ValidationResult<void> {
  const errors: string[] = [];

  metaRules.forEach((rule) => {
    if (rule.defaultValue !== undefined) {
      // Validate defaultValue against type
      if (Array.isArray(rule.type)) {
        // Type is an array of allowed values
        if (!rule.type.includes(rule.defaultValue as string)) {
          errors.push(`Invalid defaultValue "${rule.defaultValue}" for meta rule "${rule.name}". Expected one of: ${rule.type.join(", ")}`);
        }
      } else if (rule.type === "string") {
        if (typeof rule.defaultValue !== "string") {
          errors.push(`Invalid defaultValue type for meta rule "${rule.name}". Expected string, got ${typeof rule.defaultValue}`);
        }
      } else if (rule.type === "number") {
        if (typeof rule.defaultValue !== "number") {
          errors.push(`Invalid defaultValue type for meta rule "${rule.name}". Expected number, got ${typeof rule.defaultValue}`);
        }
      } else if (rule.type === "boolean") {
        if (typeof rule.defaultValue !== "boolean") {
          errors.push(`Invalid defaultValue type for meta rule "${rule.name}". Expected boolean, got ${typeof rule.defaultValue}`);
        }
      } else if (rule.type === "string[]") {
        if (!Array.isArray(rule.defaultValue) || !rule.defaultValue.every(val => typeof val === "string")) {
          errors.push(`Invalid defaultValue type for meta rule "${rule.name}". Expected string[], got ${typeof rule.defaultValue}`);
        }
      } else if (rule.type === "number[]") {
        if (!Array.isArray(rule.defaultValue) || !rule.defaultValue.every(val => typeof val === "number")) {
          errors.push(`Invalid defaultValue type for meta rule "${rule.name}". Expected number[], got ${typeof rule.defaultValue}`);
        }
      } else if (rule.type === "boolean[]") {
        if (!Array.isArray(rule.defaultValue) || !rule.defaultValue.every(val => typeof val === "boolean")) {
          errors.push(`Invalid defaultValue type for meta rule "${rule.name}". Expected boolean[], got ${typeof rule.defaultValue}`);
        }
      }
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

  // Check for valid defaultValues
  const defaultValuesResult = validateMetaRuleDefaultValues(result.data.meta);
  if (!defaultValuesResult.isValid && defaultValuesResult.errors) {
    logValidationErrors(defaultValuesResult.errors);
    return { isValid: false, errors: defaultValuesResult.errors };
  }

  return result;
}
