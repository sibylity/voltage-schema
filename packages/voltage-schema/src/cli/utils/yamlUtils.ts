import fs from "fs";
import yaml from "js-yaml";
import path from "path";

export function parseYamlFile<T>(filePath: string): { isValid: boolean; data?: T; errors?: string[] } {
  try {
    const fileContent = fs.readFileSync(filePath, "utf8");
    const data = yaml.load(fileContent) as T;
    return { isValid: true, data };
  } catch (error) {
    return {
      isValid: false,
      errors: [`Failed to parse ${path.basename(filePath)}: ${error instanceof Error ? error.message : String(error)}`]
    };
  }
}

export function yamlToJson<T>(yamlContent: string): { isValid: boolean; data?: T; errors?: string[] } {
  try {
    const data = yaml.load(yamlContent) as T;
    return { isValid: true, data };
  } catch (error) {
    return {
      isValid: false,
      errors: [`Failed to parse YAML: ${error instanceof Error ? error.message : String(error)}`]
    };
  }
}

export function jsonToYaml<T>(jsonContent: T): string {
  return yaml.dump(jsonContent);
} 