import fs from "fs";
import path from "path";
import Ajv from "ajv";

export interface ValidationResult<T> {
  isValid: boolean;
  data?: T;
  errors?: string[];
}

export interface ValidationContext {
  filePath: string;
  configIndex?: number;
}

export function createValidator(schemaPath: string) {
  const ajv = new Ajv();
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  return ajv.compile(schema);
}

export function validateFileExists(filePath: string, isOptional: boolean = false): ValidationResult<void> {
  if (!fs.existsSync(filePath)) {
    if (isOptional) {
      return { isValid: true };
    }
    return {
      isValid: false,
      errors: [`File not found: ${filePath}`]
    };
  }
  return { isValid: true };
}

export function validateFileExtension(
  filePath: string,
  allowedExtensions: string[],
  context: ValidationContext
): ValidationResult<void> {
  const ext = path.extname(filePath).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    const configMsg = context.configIndex !== undefined ? ` in generation config #${context.configIndex + 1}` : "";
    return {
      isValid: false,
      errors: [`Invalid file extension for ${path.basename(filePath)}${configMsg}. Expected: ${allowedExtensions.join(", ")}`]
    };
  }
  return { isValid: true };
}

export function parseJsonFile<T>(filePath: string): ValidationResult<T> {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
    return { isValid: true, data };
  } catch (error) {
    return {
      isValid: false,
      errors: [`Failed to parse ${path.basename(filePath)}: ${error instanceof Error ? error.message : String(error)}`]
    };
  }
}

export function formatValidationErrors(errors: string[]): string {
  return errors.map(error => `❌ ${error}`).join("\n");
}

export function logValidationStart(context: ValidationContext): void {
  const configMsg = context.configIndex !== undefined ? ` for generation config #${context.configIndex + 1}` : "";
  console.log(`🔍 Validating ${path.basename(context.filePath)}${configMsg}...`);
}

export function logValidationSuccess(context: ValidationContext): void {
  console.log(`✅ ${path.basename(context.filePath)} is valid.`);
}

export function logValidationErrors(errors: string[]): void {
  console.error(formatValidationErrors(errors));
} 