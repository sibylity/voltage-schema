import { Command } from "commander";
import { type AnalyticsConfig } from "../../types";
import { validateAnalyticsFiles } from "../validation";
import { getAnalyticsConfig, readGenerationConfigFiles } from "../utils/analyticsConfigHelper";

export function registerDimensionsCommand(program: Command) {
  program
    .command("dimensions")
    .description("List all events grouped by dimension")
    .action(() => {
      console.log("🔍 Running validation before listing dimensions...");
      if (!validateAnalyticsFiles()) {
        process.exit(1);
      }

      const config = getAnalyticsConfig();
      
      // Initialize map of dimensions to event names
      const dimensionMap: Record<string, string[]> = {};
      // Track event counts per dimension
      const dimensionEventCounts: Record<string, Record<string, number>> = {};

      // Process all generation configs
      for (const genConfig of config.generates) {
        const { globals, events } = readGenerationConfigFiles(genConfig);

        // Initialize any new dimensions from this config
        globals.dimensions.forEach((dim) => {
          if (!dimensionMap[dim.name]) {
            dimensionMap[dim.name] = [];
            dimensionEventCounts[dim.name] = {};
          }
        });

        // Populate dimensionMap with events
        Object.entries(events.events).forEach(([eventKey, event]) => {
          if (event.dimensions) {
            event.dimensions.forEach((dim) => {
              if (!dimensionMap[dim]) {
                console.warn(`⚠️  Dimension "${dim}" in event "${eventKey}" is not listed in any globals.dimensions.`);
                return;
              }

              // Handle duplicate events by tracking counts per dimension
              dimensionEventCounts[dim][eventKey] = (dimensionEventCounts[dim][eventKey] || 0) + 1;
              const count = dimensionEventCounts[dim][eventKey];
              const displayName = count > 1 
                ? `${eventKey} (${count})` 
                : eventKey;
              
              dimensionMap[dim].push(displayName);
            });
          }
        });
      }

      // Convert to array format
      const dimensionList = Object.entries(dimensionMap).map(([dimension, events]) => ({
        dimension,
        events,
      }));

      console.log(JSON.stringify(dimensionList, null, 2));
    });
} 