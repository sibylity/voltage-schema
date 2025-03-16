import path from "path";
import { type AnalyticsConfig } from "../../types";
import {
  type ValidationResult,
  type ValidationContext,
  createValidator,
  validateFileExtension,
  logValidationStart,
  logValidationSuccess,
  logValidationErrors
} from "./utils";

const validateConfigSchema = createValidator(path.resolve(__dirname, "../../schemas/analytics.config.schema.json"));

export function validateAnalyticsConfig(config: AnalyticsConfig): ValidationResult<void> {
  const context: ValidationContext = { filePath: "analytics.config.json" };
  logValidationStart(context);

  if (!validateConfigSchema(config)) {
    const errors = validateConfigSchema.errors?.map(error => 
      `Config schema validation failed: ${error.message} at ${error.instancePath}`
    ) || ["Unknown schema validation error"];
    logValidationErrors(errors);
    return { isValid: false, errors };
  }

  const errors: string[] = [];

  // Validate each generation config
  config.generates.forEach((genConfig, index) => {
    const configContext: ValidationContext = {
      filePath: genConfig.events,
      configIndex: index
    };

    // Validate events file
    if (!genConfig.events) {
      errors.push(`Missing required "events" field in generation config #${index + 1}`);
    } else {
      const eventFileResult = validateFileExtension(genConfig.events, [".json"], configContext);
      if (!eventFileResult.isValid && eventFileResult.errors) {
        errors.push(...eventFileResult.errors);
      }
    }

    // Validate globals file if provided
    if (genConfig.globals) {
      configContext.filePath = genConfig.globals;
      const globalsFileResult = validateFileExtension(genConfig.globals, [".json"], configContext);
      if (!globalsFileResult.isValid && globalsFileResult.errors) {
        errors.push(...globalsFileResult.errors);
      }
    }

    // Validate output file
    if (!genConfig.output) {
      errors.push(`Missing required "output" field in generation config #${index + 1}`);
    } else {
      configContext.filePath = genConfig.output;
      const outputFileResult = validateFileExtension(genConfig.output, [".js", ".ts", ".tsx"], configContext);
      if (!outputFileResult.isValid && outputFileResult.errors) {
        errors.push(...outputFileResult.errors);
      }
    }
  });

  if (errors.length > 0) {
    logValidationErrors(errors);
    return { isValid: false, errors };
  }

  logValidationSuccess(context);
  return { isValid: true };
} 