import fs from "fs";
import path from "path";
import { type ValidationResult, type ValidationContext } from "./types";

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