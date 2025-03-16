import path from "path";
import { type AnalyticsConfig } from "../../types";
import { getAnalyticsConfig } from "../utils/analyticsConfigHelper";
import { validateGlobals } from "./validateAnalyticsGlobals";
import { validateEvents } from "./validateAnalyticsEvents";
import { validateAnalyticsConfig } from "./validateAnalyticsConfig";
import { type ValidationResult, logValidationErrors } from "./utils";

function validateGenerationConfigs(config: AnalyticsConfig): ValidationResult<void> {
  const errors: string[] = [];

  for (const genConfig of config.generates) {
    const globalsPath = path.resolve(process.cwd(), genConfig.globals);
    const eventsPath = path.resolve(process.cwd(), genConfig.events);

    // Validate globals (optional)
    const globalsResult = validateGlobals(globalsPath);
    if (!globalsResult.isValid) {
      if (globalsResult.errors) {
        errors.push(...globalsResult.errors);
      }
      continue;
    }

    // Get valid dimensions for events validation
    const validDimensions = new Set(globalsResult.data?.dimensions.map(dim => dim.name) || []);

    // Validate events (required)
    const eventsResult = validateEvents(eventsPath, validDimensions, globalsResult.data !== undefined);
    if (!eventsResult.isValid && eventsResult.errors) {
      errors.push(...eventsResult.errors);
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return { isValid: true };
}

export function validateAnalyticsFiles(): boolean {
  try {
    const config = getAnalyticsConfig();
    
    // Validate config file
    const configResult = validateAnalyticsConfig(config);
    if (!configResult.isValid) {
      if (configResult.errors) {
        logValidationErrors(configResult.errors);
      }
      return false;
    }

    // Validate generation configs
    const genResult = validateGenerationConfigs(config);
    if (!genResult.isValid) {
      if (genResult.errors) {
        logValidationErrors(genResult.errors);
      }
      return false;
    }

    console.log("✅ All analytics files are valid, and all events have correct structures.");
    return true;
  } catch (error) {
    console.error("❌ Unexpected error during validation:", error instanceof Error ? error.message : String(error));
    return false;
  }
} 
