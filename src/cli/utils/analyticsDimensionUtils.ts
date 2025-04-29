import { getAnalyticsConfig, readGenerationConfigFiles } from "./analyticsConfigHelper";
import { type AnalyticsEvents, type AnalyticsGlobals } from "../../types";
import fs from 'fs';

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
      contains?: string;
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
      contains?: string;
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
  // If event has no dimensions field, include it in all dimensions
  if (!event.dimensions) {
    Object.keys(dimensionMap).forEach((dim) => {
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
    return;
  }
  
  // If event has an empty dimensions array, add it to "Ungrouped" dimension
  if (Array.isArray(event.dimensions) && event.dimensions.length === 0) {
    if (!dimensionMap["Ungrouped"]) {
      dimensionMap["Ungrouped"] = {
        events: [],
        eventDetails: []
      };
      dimensionEventCounts["Ungrouped"] = {};
    }
    
    // Track event count for Ungrouped dimension
    dimensionEventCounts["Ungrouped"][eventKey] = (dimensionEventCounts["Ungrouped"][eventKey] || 0) + 1;
    const count = dimensionEventCounts["Ungrouped"][eventKey];
    
    // Add event to Ungrouped dimension with count if needed
    const displayName = count > 1 ? `${eventKey} (${count})` : eventKey;
    dimensionMap["Ungrouped"].events.push(displayName);
    dimensionMap["Ungrouped"].eventDetails.push({
      key: eventKey,
      name: event.name,
      description: event.description
    });
    return;
  }

  // Handle the new dimensions format with inclusive/exclusive arrays
  if (typeof event.dimensions === 'object' && !Array.isArray(event.dimensions)) {
    const dimensions = event.dimensions as { inclusive?: string[]; exclusive?: string[] };
    // Get all available dimensions
    const allDimensions = Object.keys(dimensionMap);
    
    // Handle inclusive dimensions
    if (dimensions.inclusive && Array.isArray(dimensions.inclusive)) {
      // Only include the specified dimensions
      dimensions.inclusive.forEach((dim) => {
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
    // Handle exclusive dimensions
    else if (dimensions.exclusive && Array.isArray(dimensions.exclusive)) {
      // Include all dimensions except the excluded ones
      allDimensions.forEach((dim) => {
        if (dimensions.exclusive && dimensions.exclusive.includes(dim)) {
          return; // Skip excluded dimensions
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
    return;
  }
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
      identifiers: dimensionConfig.identifiers || { AND: [], OR: [] },
      events: data.events
    };

    if (includeEventDetails) {
      output.eventDetails = data.eventDetails;
    }

    return output;
  });
}

interface Dimension {
  name: string;
  description: string;
  identifiers: {
    AND: Array<{
      equals?: string;
      notEquals?: string;
      contains?: string;
      notContains?: string;
      startsWith?: string;
      endsWith?: string;
    }>;
    OR: Array<{
      equals?: string;
      notEquals?: string;
      contains?: string;
      notContains?: string;
      startsWith?: string;
      endsWith?: string;
    }>;
  };
}

interface GetAllDimensionsOptions {
  includeEventDetails?: boolean;
  verbose?: boolean;
  events?: AnalyticsEvents;
  dimensions?: Dimension[];
}

export function getAllDimensions(options: GetAllDimensionsOptions = {}): DimensionData[] | Dimension[] {
  // If dimensions are provided directly, use those
  if (options.dimensions) {
    return options.dimensions;
  }

  // Otherwise, use the original implementation
  const config = getAnalyticsConfig();
  let dimensionMap: DimensionEventMap = {};
  let dimensionEventCounts: DimensionEventCounts = {};
  let isFirstConfig = true;
  let globals: AnalyticsGlobals | undefined;

  // Process all generation configs
  config.generates.forEach(genConfig => {
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
  });

  if (!globals) {
    throw new Error("No globals configuration found");
  }

  return formatDimensionOutput(dimensionMap, globals, options.includeEventDetails || options.verbose || false);
} 