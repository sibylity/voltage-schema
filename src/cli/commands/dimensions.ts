import { Command } from "commander";
import { type AnalyticsConfig, type AnalyticsEvents, type AnalyticsGlobals, type Dimension } from "../../types";
import { validateAnalyticsFiles } from "../validation";
import { getAnalyticsConfig, readGenerationConfigFiles } from "../utils/analyticsConfigHelper";

interface DimensionEventMap {
  [dimension: string]: {
    events: string[];
    eventDetails: Array<{
      key: string;
      name: string;
      description: string;
    }>;
  };
}

interface DimensionEventCounts {
  [dimension: string]: {
    [event: string]: number;
  };
}

interface DimensionOutput {
  dimension: string;
  description: string;
  identifiers: Array<{
    property: string;
    contains?: (string | number | boolean)[];
    equals?: string | number | boolean;
    not?: string | number | boolean;
    in?: (string | number | boolean)[];
    notIn?: (string | number | boolean)[];
    startsWith?: string;
    endsWith?: string;
    lt?: number;
    lte?: number;
    gt?: number;
    gte?: number;
  }>;
  events: string[];
  eventDetails?: Array<{
    key: string;
    name: string;
    description: string;
  }>;
}

function initializeDimensionMaps(globals: AnalyticsGlobals): {
  dimensionMap: DimensionEventMap;
  dimensionEventCounts: DimensionEventCounts;
} {
  const dimensionMap: DimensionEventMap = {};
  const dimensionEventCounts: DimensionEventCounts = {};

  globals.dimensions.forEach((dim) => {
    dimensionMap[dim.name] = {
      events: [],
      eventDetails: []
    };
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
    dimensionMap[dim].events.push(displayName);
    dimensionMap[dim].eventDetails.push({
      key: eventKey,
      name: event.name,
      description: event.description
    });
  });
}

function formatDimensionOutput(
  dimensionMap: DimensionEventMap,
  globals: AnalyticsGlobals,
  includeEventDetails: boolean
): DimensionOutput[] {
  return Object.entries(dimensionMap).map(([dimension, data]) => {
    const dimensionConfig = globals.dimensions.find(d => d.name === dimension);
    if (!dimensionConfig) {
      throw new Error(`Dimension "${dimension}" not found in globals`);
    }

    const output: DimensionOutput = {
      dimension,
      description: dimensionConfig.description,
      identifiers: dimensionConfig.identifiers,
      events: data.events
    };

    if (includeEventDetails) {
      output.eventDetails = data.eventDetails;
    }

    return output;
  });
}

export function registerDimensionsCommand(program: Command) {
  program
    .command("dimensions")
    .description("List all events grouped by dimension")
    .option("--include-event-details", "Include event names and descriptions in the output")
    .action((options) => {
      try {
        console.log("🔍 Running validation before listing dimensions...");
        if (!validateAnalyticsFiles()) {
          process.exit(1);
        }

        const config = getAnalyticsConfig();
        let dimensionMap: DimensionEventMap = {};
        let dimensionEventCounts: DimensionEventCounts = {};
        let isFirstConfig = true;
        let globals: AnalyticsGlobals | undefined;

        // Process all generation configs
        for (const genConfig of config.generates) {
          const { globals: currentGlobals, events } = readGenerationConfigFiles(genConfig);

          // Store globals from first config
          if (isFirstConfig) {
            globals = currentGlobals;
          }

          // Initialize maps only from the first config that has dimensions
          if (isFirstConfig || Object.keys(dimensionMap).length === 0) {
            ({ dimensionMap, dimensionEventCounts } = initializeDimensionMaps(currentGlobals));
            isFirstConfig = false;
          }

          // Process each event in the current config
          Object.entries(events.events).forEach(([eventKey, event]) => {
            processEvent(eventKey, event, dimensionMap, dimensionEventCounts);
          });
        }

        if (!globals) {
          throw new Error("No globals configuration found");
        }

        // Format and output results
        const dimensionList = formatDimensionOutput(dimensionMap, globals, options.includeEventDetails);
        console.log(JSON.stringify(dimensionList, null, 2));
      } catch (error) {
        console.error("❌ Error listing dimensions:", error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
} 