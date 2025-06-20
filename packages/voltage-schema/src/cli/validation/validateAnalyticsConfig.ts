import fs from "fs";
import path from "path";
import type { ErrorObject } from "ajv";
import { type AnalyticsConfig } from "../../types";
import { type ValidationResult, type ValidationContext } from "./types";
import { createValidator } from "./schemaValidation";
import { parseSchemaFile } from "./fileValidation";
import { logValidationStart, logValidationSuccess, logValidationErrors } from "./logging";

const validateConfigSchema = createValidator(path.resolve(__dirname, "../../schemas/analytics.config.schema.json"));
const validateGroupsSchema = createValidator(path.resolve(__dirname, "../../schemas/analytics.groups.schema.json"));
const validateDimensionsSchema = createValidator(path.resolve(__dirname, "../../schemas/analytics.dimensions.schema.json"));
const validateMetaSchema = createValidator(path.resolve(__dirname, "../../schemas/analytics.meta.schema.json"));

export function validateAnalyticsConfig(configPath: string, context: { filePath: string }): { isValid: boolean; errors?: string[] } {
  if (!fs.existsSync(configPath)) {
    return { isValid: false, errors: [`Config file not found: ${configPath}`] };
  }

  let config: AnalyticsConfig;
  if (configPath.endsWith(".js")) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    config = require(configPath).default || require(configPath);
  } else {
    config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  }

  if (!config || !config.generates || !Array.isArray(config.generates)) {
    return { isValid: false, errors: ["Config must have a 'generates' array."] };
  }

  const errors: string[] = [];
  config.generates.forEach((genConfig, index) => {
    if (!genConfig.events) {
      errors.push(`Generation config at index ${index} is missing 'events' property.`);
    }
    if (!genConfig.output) {
      errors.push(`Generation config at index ${index} is missing 'output' property.`);
    }
  });

  return { isValid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
}
