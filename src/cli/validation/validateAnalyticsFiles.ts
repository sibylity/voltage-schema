import path from "path";
import { type AnalyticsConfig } from "../../types";
import { type ValidationResult } from "./types";
import { logValidationErrors } from "./logging";
import { validateAnalyticsConfig } from "./validateAnalyticsConfig";
import { validateEvents } from "./validateAnalyticsEvents";
import { getAnalyticsConfig } from "../utils/analyticsConfigHelper";
import { validateGroups } from "./validateAnalyticsGroups";

export function validateAnalyticsFiles(): boolean {
  const config = getAnalyticsConfig();
  const configPath = path.resolve(process.cwd(), "analytics.config.json");
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

    // If we found duplicate groups, log the error
    if (duplicateGroups.size > 0) {
      const errorMessage = `Found duplicate group names across group files: ${Array.from(duplicateGroups).join(', ')}`;
      logValidationErrors([errorMessage]);
      hasValidGroups = false;
    }

    // Combine dimensions from all group files
    const allDimensions = new Set<string>();
    for (const groupFile of genConfig.groups) {
      const groupPath = path.resolve(process.cwd(), groupFile);
      const groupsResult = validateGroups(groupPath, eventsPath);
      
      if (!groupsResult.isValid) {
        hasValidGroups = false;
        continue;
      }

      // Add dimensions from this group file to the set
      groupsResult.data?.dimensions?.forEach((dim: { name: string }) => {
        allDimensions.add(dim.name);
      });
    }

    if (!hasValidGroups) {
      return false;
    }

    const eventsResult = validateEvents(eventsPath, allDimensions, true);
    if (!eventsResult.isValid) {
      return false;
    }
  }

  return true;
} 
