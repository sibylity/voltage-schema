import path from "path";
import { type AnalyticsConfig } from "../../types";
import { type ValidationResult } from "./types";
import { logValidationErrors } from "./logging";
import { validateAnalyticsConfig } from "./validateAnalyticsConfig";
import { validateGlobals } from "./validateAnalyticsGlobals";
import { validateEvents } from "./validateAnalyticsEvents";
import { getAnalyticsConfig } from "../utils/analyticsConfigHelper";

export function validateAnalyticsFiles(): boolean {
  const config = getAnalyticsConfig();
  const configPath = path.resolve(process.cwd(), "analytics.config.json");
  const configResult = validateAnalyticsConfig(configPath, { filePath: configPath });
  if (!configResult.isValid) {
    return false;
  }

  const globalsPath = path.resolve(process.cwd(), config.generates[0].globals || "");
  const eventsPath = path.resolve(process.cwd(), config.generates[0].events);

  const globalsResult = validateGlobals(globalsPath, eventsPath);
  if (!globalsResult.isValid) {
    return false;
  }

  const validDimensions = new Set<string>(
    globalsResult.data?.dimensions.map((dim: { name: string }) => dim.name) || []
  );
  const eventsResult = validateEvents(eventsPath, validDimensions, globalsResult.data !== undefined);
  if (!eventsResult.isValid) {
    return false;
  }

  return true;
} 
