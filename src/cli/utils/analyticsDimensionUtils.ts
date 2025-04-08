import { getAnalyticsConfig, readGenerationConfigFiles } from "./analyticsConfigHelper";
import { type AnalyticsEvents, type AnalyticsGlobals } from "../../types";

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

export interface DimensionData {
  dimension: string;
  description: string;
  identifiers: {
    AND?: Array<{
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
    OR?: Array<{
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
  };
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
      console.warn(`⚠️  Dimension "${dim}" in event "${eventKey}" is not listed in any dimensions.`);
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
): DimensionData[] {
  return Object.entries(dimensionMap).map(([dimension, data]) => {
    const dimensionConfig = globals.dimensions.find(d => d.name === dimension);
    if (!dimensionConfig) {
      throw new Error(`Dimension "${dimension}" not found in globals`);
    }

    const output: DimensionData = {
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

interface GetAllDimensionsOptions {
  includeEventDetails?: boolean;
  verbose?: boolean;
}

export function getAllDimensions(options: GetAllDimensionsOptions = {}): DimensionData[] {
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

  return formatDimensionOutput(dimensionMap, globals, options.includeEventDetails || options.verbose || false);
} 