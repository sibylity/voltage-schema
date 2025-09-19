import path from "path";
import { logValidationErrors } from "./logging";
import { validateAnalyticsConfig } from "./validateAnalyticsConfig";
import { validateEvents } from "./validateAnalyticsEvents";
import { getAnalyticsConfig } from "../utils/analyticsConfigHelper";
import { validateGroups } from "./validateAnalyticsGroups";
import { validateDimensions } from "./validateAnalyticsDimensions";
import { validateMeta } from "./validateAnalyticsMeta";
import fs from "fs";
import { type AnalyticsConfig } from "../../types";

export function validateAnalyticsFiles(): boolean {
  const cwd = process.cwd();
  const jsConfigPath = path.resolve(cwd, "voltage.config.js");

  let configPath: string;
  if (fs.existsSync(jsConfigPath)) {
    configPath = jsConfigPath;
  } else {
    console.error("❌ No voltage.config.js found. Run 'npm voltage init' to create it.");
    return false;
  }

  console.log(`🔍 Validating ${configPath}...`);
  const result = validateAnalyticsConfig(configPath, { filePath: configPath });
  if (!result.isValid) {
    console.error(`❌ Failed to parse ${configPath}:`, result.errors);
    return false;
  }
  console.log(`✅ ${configPath} is valid.`);

  try {
    let config: AnalyticsConfig;
    if (configPath.endsWith(".js")) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      config = require(configPath).default || require(configPath);
    } else {
      config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    }

    // Process each generation config
    for (const genConfig of config.generates) {
      let eventsPath: string;
      
      if (genConfig.mergedSchemaFile) {
        // For merged schema files, we'll use the merged file path for validation
        eventsPath = path.resolve(process.cwd(), genConfig.mergedSchemaFile);
      } else if (genConfig.events) {
        eventsPath = path.resolve(process.cwd(), genConfig.events);
      } else {
        console.error("❌ Generation config must have either 'events' or 'mergedSchemaFile'");
        return false;
      }

      // Track group names to check for duplicates
      const groupNames = new Set<string>();
      const duplicateGroups = new Set<string>();
      let hasValidGroups = true;

      // Track dimension names to check for duplicates
      const dimensionNames = new Set<string>();
      const duplicateDimensions = new Set<string>();
      let hasValidDimensions = true;

      if (genConfig.mergedSchemaFile) {
        // For merged schema files, we'll skip individual file validation
        // TODO: Implement proper merged schema validation
        console.log(`ℹ️ Skipping groups/dimensions validation for merged schema file`);
      } else {
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
      }

      // Validate meta if present
      let metaRules;
      if (genConfig.meta) {
        const metaPath = path.resolve(process.cwd(), genConfig.meta);
        const metaResult = validateMeta(metaPath);
        if (!metaResult.isValid) {
          return false;
        }
        metaRules = metaResult.data?.meta;
      }

      if (!hasValidGroups || !hasValidDimensions) {
        return false;
      }

      // Always validate events with meta rules (empty array if no meta file)
      if (genConfig.mergedSchemaFile) {
        // TODO: Implement proper merged schema validation
        // For now, skip detailed validation for merged schema files
        console.log(`ℹ️ Skipping detailed validation for merged schema file: ${genConfig.mergedSchemaFile}`);
      } else {
        const eventsResult = validateEvents(eventsPath, Array.from(dimensionNames), true, metaRules || []);
        if (!eventsResult.isValid) {
          return false;
        }
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

      // Validate meta file exists
      if (genConfig.meta && !fs.existsSync(genConfig.meta)) {
        throw new Error(`Meta file not found: ${genConfig.meta}`);
      }
    });

    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}
