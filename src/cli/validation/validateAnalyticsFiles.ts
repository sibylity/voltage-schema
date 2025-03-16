import fs from "fs";
import path from "path";
import { type AnalyticsConfig } from "../../types";
import { getAnalyticsConfig, validateAnalyticsConfig } from "./validateAnalyticsConfig";
import { validateGlobals } from "./validateAnalyticsGlobals";
import { validateEvents } from "./validateAnalyticsEvents";

function validateGenerationConfigs(config: AnalyticsConfig): boolean {
  let isValid = true;

  for (const genConfig of config.generates) {
    const globalsPath = path.resolve(process.cwd(), genConfig.globals);
    const eventsPath = path.resolve(process.cwd(), genConfig.events);

    // Validate globals (optional)
    const { isValid: globalsValid, globals } = validateGlobals(globalsPath);
    if (!globalsValid) {
      isValid = false;
      continue;
    }

    // Get valid dimensions for events validation
    const validDimensions = new Set(globals.dimensions.map((dim) => dim.name));

    // Validate events (required)
    if (!validateEvents(eventsPath, validDimensions, fs.existsSync(globalsPath))) {
      isValid = false;
    }
  }

  return isValid;
}

export function validateAnalyticsFiles(): boolean {
  const config = getAnalyticsConfig();
  
  if (!validateAnalyticsConfig(config)) {
    return false;
  }

  if (!validateGenerationConfigs(config)) {
    return false;
  }

  console.log("✅ All analytics files are valid, and all events have correct structures.");
  return true;
} 