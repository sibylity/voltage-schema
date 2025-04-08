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

  // Combine groups and dimensions from all files
  const combinedGlobals: AnalyticsGlobals = {
    groups: [],
    dimensions: []
  };

  // Process groups if present
  if (genConfig.groups) {
    for (const groupFile of genConfig.groups) {
      const groupPath = path.resolve(process.cwd(), groupFile);
      if (fs.existsSync(groupPath)) {
        try {
          const groupContent = JSON.parse(fs.readFileSync(groupPath, "utf8")) as AnalyticsGlobals;
          if (groupContent.groups) {
            combinedGlobals.groups.push(...groupContent.groups);
          }
        } catch (error) {
          console.error(`❌ Failed to parse group file at ${groupPath}:`, error);
          process.exit(1);
        }
      } else {
        console.log(`ℹ️ Group file not found at ${groupPath}, skipping.`);
      }
    }
  }

  // Process dimensions if present
  if (genConfig.dimensions) {
    for (const dimensionFile of genConfig.dimensions) {
      const dimensionPath = path.resolve(process.cwd(), dimensionFile);
      if (fs.existsSync(dimensionPath)) {
        try {
          const dimensionContent = JSON.parse(fs.readFileSync(dimensionPath, "utf8")) as AnalyticsGlobals;
          if (dimensionContent.dimensions) {
            combinedGlobals.dimensions.push(...dimensionContent.dimensions);
          }
        } catch (error) {
          console.error(`❌ Failed to parse dimension file at ${dimensionPath}:`, error);
          process.exit(1);
        }
      } else {
        console.log(`ℹ️ Dimension file not found at ${dimensionPath}, skipping.`);
      }
    }
  }

  return { globals: combinedGlobals, events };
} 