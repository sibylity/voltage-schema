import path from "path";
import { type ValidationContext } from "./types";

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