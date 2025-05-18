import fs from "fs";
import path from "path";
import { type AnalyticsConfig, type AnalyticsGlobals, type AnalyticsEvents } from "../../types";
import { parseSchemaFile } from "../validation/fileValidation";

export function getAnalyticsConfig(): AnalyticsConfig {
  const configPath = path.resolve(process.cwd(), "voltage.config.json");

  if (!fs.existsSync(configPath)) {
    throw new Error("voltage.config.json not found. Run 'npm voltage init' to create it.");
  }

  const config = JSON.parse(fs.readFileSync(configPath, "utf8")) as AnalyticsConfig;
  return config;
}

export function readGenerationConfigFiles(genConfig: { events: string; groups?: string[]; dimensions?: string[] }) {
  const eventsPath = path.resolve(process.cwd(), genConfig.events);
  if (!fs.existsSync(eventsPath)) {
    console.error(`❌ Events file not found: ${eventsPath}`);
    process.exit(1);
  }

  const eventsResult = parseSchemaFile<AnalyticsEvents>(eventsPath);
  if (!eventsResult.isValid || !eventsResult.data) {
    console.error(`❌ Failed to parse events file at ${eventsPath}:`, eventsResult.errors);
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
        const groupResult = parseSchemaFile<AnalyticsGlobals>(groupPath);
        if (!groupResult.isValid || !groupResult.data) {
          console.error(`❌ Failed to parse group file at ${groupPath}:`, groupResult.errors);
          process.exit(1);
        }
        if (groupResult.data.groups) {
          combinedGlobals.groups.push(...groupResult.data.groups);
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
        const dimensionResult = parseSchemaFile<AnalyticsGlobals>(dimensionPath);
        if (!dimensionResult.isValid || !dimensionResult.data) {
          console.error(`❌ Failed to parse dimension file at ${dimensionPath}:`, dimensionResult.errors);
          process.exit(1);
        }
        if (dimensionResult.data.dimensions) {
          combinedGlobals.dimensions.push(...dimensionResult.data.dimensions);
        }
      } else {
        console.log(`ℹ️ Dimension file not found at ${dimensionPath}, skipping.`);
      }
    }
  }

  return { globals: combinedGlobals, events: eventsResult.data };
}
