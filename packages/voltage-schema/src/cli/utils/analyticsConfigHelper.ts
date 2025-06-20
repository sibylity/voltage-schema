import fs from "fs";
import path from "path";
import { type AnalyticsConfig, type AnalyticsGlobals, type AnalyticsEvents } from "../../types";
import { parseSchemaFile } from "../validation/fileValidation";

export function getAnalyticsConfig(): AnalyticsConfig {
  const cwd = process.cwd();
  const jsConfigPath = path.resolve(cwd, "voltage.config.js");
  const jsonConfigPath = path.resolve(cwd, "voltage.config.json");

  let config: AnalyticsConfig | undefined;

  if (fs.existsSync(jsConfigPath)) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    config = require(jsConfigPath).default || require(jsConfigPath);
  } else if (fs.existsSync(jsonConfigPath)) {
    config = JSON.parse(fs.readFileSync(jsonConfigPath, "utf8"));
  } else {
    throw new Error("No voltage.config.js or voltage.config.json found. Run 'npm voltage init' to create it.");
  }

  if (!config) {
    throw new Error("Failed to load voltage config. No valid config found or config is empty.");
  }
  return config;
}

export function readGenerationConfigFiles(genConfig: { events: string; groups?: string[]; dimensions?: string[]; meta?: string }) {
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
    dimensions: [],
    meta: []
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

  // Process meta file if present
  if (genConfig.meta) {
    const metaPath = path.resolve(process.cwd(), genConfig.meta);
    if (fs.existsSync(metaPath)) {
      const metaResult = parseSchemaFile<{ meta: any[] }>(metaPath);
      if (!metaResult.isValid || !metaResult.data) {
        console.error(`❌ Failed to parse meta file at ${metaPath}:`, metaResult.errors);
        process.exit(1);
      }
      if (metaResult.data.meta) {
        combinedGlobals.meta = metaResult.data.meta;
      }
    } else {
      console.log(`ℹ️ Meta file not found at ${metaPath}, skipping.`);
    }
  }

  return { globals: combinedGlobals, events: eventsResult.data };
}
