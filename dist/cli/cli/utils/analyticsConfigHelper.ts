import fs from "fs";
import path from "path";
import { type AnalyticsConfig, type AnalyticsGlobals, type AnalyticsEvents } from "../../types";

export function getAnalyticsConfig(): AnalyticsConfig {
  const configPath = path.resolve(process.cwd(), "analytics.config.json");
  
  if (!fs.existsSync(configPath)) {
    console.error("❌ analytics.config.json file is missing in project root.");
    process.exit(1);
  }

  try {
    return JSON.parse(fs.readFileSync(configPath, "utf8")) as AnalyticsConfig;
  } catch (error) {
    console.error("❌ Failed to parse analytics.config.json:", error);
    process.exit(1);
  }
}

export interface GenerationFiles {
  globals: AnalyticsGlobals;
  events: AnalyticsEvents;
}

export function readGenerationConfigFiles(genConfig: AnalyticsConfig["generates"][0]): GenerationFiles {
  const globalsPath = path.resolve(process.cwd(), genConfig.globals);
  const eventsPath = path.resolve(process.cwd(), genConfig.events);

  if (!fs.existsSync(eventsPath)) {
    console.error(`❌ Events file not found: ${eventsPath}`);
    process.exit(1);
  }

  let events: AnalyticsEvents;
  try {
    events = JSON.parse(fs.readFileSync(eventsPath, "utf8")) as AnalyticsEvents;
  } catch (error) {
    console.error(`❌ Failed to parse events file at ${eventsPath}:`, error);
    process.exit(1);
  }

  let globals: AnalyticsGlobals;
  if (fs.existsSync(globalsPath)) {
    try {
      globals = JSON.parse(fs.readFileSync(globalsPath, "utf8")) as AnalyticsGlobals;
    } catch (error) {
      console.error(`❌ Failed to parse globals file at ${globalsPath}:`, error);
      process.exit(1);
    }
  } else {
    console.log(`ℹ️ No globals file found at ${globalsPath}, using default empty values.`);
    globals = {
      dimensions: [],
      properties: []
    };
  }

  return { globals, events };
} 