import fs from "fs";
import path from "path";
import { parseYamlFile } from "../utils/yamlUtils";
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

export function validateFileExtension(filePath: string): string | null {
  const ext = path.extname(filePath).toLowerCase();
  if (ext !== ".json" && ext !== ".yaml" && ext !== ".yml") {
    return `Invalid file extension: ${ext}. Expected .json, .yaml, or .yml`;
  }
  return null;
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

export function parseSchemaFile<T>(filePath: string): ValidationResult<T> {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".json") {
    return parseJsonFile<T>(filePath);
  } else if (ext === ".yaml" || ext === ".yml") {
    return parseYamlFile<T>(filePath);
  }
  return {
    isValid: false,
    errors: [`Unsupported file extension: ${ext}`]
  };
}
