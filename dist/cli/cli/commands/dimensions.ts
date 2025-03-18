import { Command } from "commander";
import { type AnalyticsConfig, type AnalyticsEvents, type AnalyticsGlobals } from "../../types";
import { validateAnalyticsFiles } from "../validation";
import { getAnalyticsConfig, readGenerationConfigFiles } from "../utils/analyticsConfigHelper";

interface DimensionEventMap {
  [dimension: string]: string[];
}

interface DimensionEventCounts {
  [dimension: string]: {
    [event: string]: number;
  };
}

interface DimensionOutput {
  dimension: string;
  events: string[];
}

function initializeDimensionMaps(globals: AnalyticsGlobals): {
  dimensionMap: DimensionEventMap;
  dimensionEventCounts: DimensionEventCounts;
} {
  const dimensionMap: DimensionEventMap = {};
  const dimensionEventCounts: DimensionEventCounts = {};

  globals.dimensions.forEach((dim) => {
    dimensionMap[dim.name] = [];
    dimensionEventCounts[dim.name] = {};
  });

  return { dimensionMap, dimensionEventCounts };
}

function processEvent(
  eventKey: string,
  event: AnalyticsEvents["events"][string],
  dimensionMap: DimensionEventMap,
  dimensionEventCounts: DimensionEventCounts
): void {
  if (!event.dimensions) return;

  event.dimensions.forEach((dim) => {
    if (!dimensionMap[dim]) {
      console.warn(`⚠️  Dimension "${dim}" in event "${eventKey}" is not listed in any globals.dimensions.`);
      return;
    }

    // Track event count for this dimension
    dimensionEventCounts[dim][eventKey] = (dimensionEventCounts[dim][eventKey] || 0) + 1;
    const count = dimensionEventCounts[dim][eventKey];
    
    // Add event to dimension map with count if needed
    const displayName = count > 1 ? `${eventKey} (${count})` : eventKey;
    dimensionMap[dim].push(displayName);
  });
}

function formatDimensionOutput(dimensionMap: DimensionEventMap): DimensionOutput[] {
  return Object.entries(dimensionMap).map(([dimension, events]) => ({
    dimension,
    events,
  }));
}

export function registerDimensionsCommand(program: Command) {
  program
    .command("dimensions")
    .description("List all events grouped by dimension")
    .action(() => {
      try {
        console.log("🔍 Running validation before listing dimensions...");
        if (!validateAnalyticsFiles()) {
          process.exit(1);
        }

        const config = getAnalyticsConfig();
        let dimensionMap: DimensionEventMap = {};
        let dimensionEventCounts: DimensionEventCounts = {};
        let isFirstConfig = true;

        // Process all generation configs
        for (const genConfig of config.generates) {
          const { globals, events } = readGenerationConfigFiles(genConfig);

          // Initialize maps only from the first config that has dimensions
          if (isFirstConfig || Object.keys(dimensionMap).length === 0) {
            ({ dimensionMap, dimensionEventCounts } = initializeDimensionMaps(globals));
            isFirstConfig = false;
          }

          // Process each event in the current config
          Object.entries(events.events).forEach(([eventKey, event]) => {
            processEvent(eventKey, event, dimensionMap, dimensionEventCounts);
          });
        }

        // Format and output results
        const dimensionList = formatDimensionOutput(dimensionMap);
        console.log(JSON.stringify(dimensionList, null, 2));
      } catch (error) {
        console.error("❌ Error processing dimensions:", error);
        process.exit(1);
      }
    });
} 