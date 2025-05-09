import path from "path";
import { logValidationErrors } from "./logging";
import { validateAnalyticsConfig } from "./validateAnalyticsConfig";
import { validateEvents } from "./validateAnalyticsEvents";
import { getAnalyticsConfig } from "../utils/analyticsConfigHelper";
import { validateGroups } from "./validateAnalyticsGroups";
import { validateDimensions } from "./validateAnalyticsDimensions";
import fs from "fs";
import { type AnalyticsConfig } from "../../types";

export function validateAnalyticsFiles(): boolean {
  console.log("🔍 Validating voltage.config.json...");
  const configPath = path.resolve(process.cwd(), "voltage.config.json");
  if (!fs.existsSync(configPath)) {
    console.error(`❌ Failed to parse voltage.config.json: ENOENT: no such file or directory, open '${configPath}'`);
    return false;
  }

  try {
    const config = JSON.parse(fs.readFileSync(configPath, "utf8")) as AnalyticsConfig;
    const configResult = validateAnalyticsConfig(configPath, { filePath: configPath });
    if (!configResult.isValid) {
      return false;
    }

    // Process each generation config
    for (const genConfig of config.generates) {
      const eventsPath = path.resolve(process.cwd(), genConfig.events);

      // Track group names to check for duplicates
      const groupNames = new Set<string>();
      const duplicateGroups = new Set<string>();
      let hasValidGroups = true;

      // First pass: collect all group names and check for duplicates
      if (genConfig.groups) {
        for (const groupFile of genConfig.groups) {
          const groupPath = path.resolve(process.cwd(), groupFile);
          const groupsResult = validateGroups(groupPath, eventsPath);

          if (!groupsResult.isValid) {
            hasValidGroups = false;
            continue;
          }

          // Check for duplicate group names
          groupsResult.data?.groups?.forEach((group: { name: string }) => {
            if (groupNames.has(group.name)) {
              duplicateGroups.add(group.name);
            } else {
              groupNames.add(group.name);
            }
          });
        }
      }

      // If we found duplicate groups, log the error
      if (duplicateGroups.size > 0) {
        const errorMessage = `Found duplicate group names across group files: ${Array.from(duplicateGroups).join(', ')}`;
        logValidationErrors([errorMessage]);
        hasValidGroups = false;
      }

      // Track dimension names to check for duplicates
      const dimensionNames = new Set<string>();
      const duplicateDimensions = new Set<string>();
      let hasValidDimensions = true;

      // Validate dimensions if present
      if (genConfig.dimensions) {
        for (const dimensionFile of genConfig.dimensions) {
          const dimensionPath = path.resolve(process.cwd(), dimensionFile);
          const dimensionsResult = validateDimensions(dimensionPath, eventsPath);

          if (!dimensionsResult.isValid) {
            hasValidDimensions = false;
            continue;
          }

          // Check for duplicate dimension names
          dimensionsResult.data?.dimensions?.forEach((dim: { name: string }) => {
            if (dimensionNames.has(dim.name)) {
              duplicateDimensions.add(dim.name);
            } else {
              dimensionNames.add(dim.name);
            }
          });
        }
      }

      // If we found duplicate dimensions, log the error
      if (duplicateDimensions.size > 0) {
        const errorMessage = `Found duplicate dimension names across dimension files: ${Array.from(duplicateDimensions).join(', ')}`;
        logValidationErrors([errorMessage]);
        hasValidDimensions = false;
      }

      if (!hasValidGroups || !hasValidDimensions) {
        return false;
      }

      const eventsResult = validateEvents(eventsPath, Array.from(dimensionNames), true);
      if (!eventsResult.isValid) {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

export function validateAnalyticsFilesWithFs(): boolean {
  try {
    const config = getAnalyticsConfig();

    // Validate all files exist
    config.generates.forEach(genConfig => {
      // Validate events file exists
      if (!fs.existsSync(genConfig.events)) {
        throw new Error(`Events file not found: ${genConfig.events}`);
      }

      // Validate group files exist
      if (genConfig.groups) {
        genConfig.groups.forEach(groupFile => {
          if (!fs.existsSync(groupFile)) {
            throw new Error(`Group file not found: ${groupFile}`);
          }
        });
      }

      // Validate dimension files exist
      if (genConfig.dimensions) {
        genConfig.dimensions.forEach(dimensionFile => {
          if (!fs.existsSync(dimensionFile)) {
            throw new Error(`Dimension file not found: ${dimensionFile}`);
          }
        });
      }
    });

    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}
