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
  // If event has no dimensions field, auto-apply to all dimensions
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

  // Handle the new dimensions format with included/excluded arrays
  if (typeof event.dimensions === 'object' && !Array.isArray(event.dimensions)) {
    const dimensions = event.dimensions as { included?: string[]; excluded?: string[] };
    // Get all available dimensions
    const allDimensions = Object.keys(dimensionMap);

    // Handle included dimensions
    if (dimensions.included && Array.isArray(dimensions.included)) {
      // If included array is empty, add to "Ungrouped" dimension
      if (dimensions.included.length === 0) {
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

      // Only include the specified dimensions
      dimensions.included.forEach((dim) => {
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
    // Handle excluded dimensions
    else if (dimensions.excluded && Array.isArray(dimensions.excluded)) {
      // Include all dimensions except the excluded ones
      allDimensions.forEach((dim) => {
        if (dimensions.excluded && dimensions.excluded.includes(dim)) {
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

  // Handle the shorthand for event dimensions (array of dimensions)
  if (Array.isArray(event.dimensions)) {
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
}

function formatDimensionOutput(
  dimensionMap: DimensionEventMap,
  globals: AnalyticsGlobals,
  includeEventDetails: boolean
): DimensionData[] {
  return Object.entries(dimensionMap).map(([dimension, data]) => {
    // Special handling for "Ungrouped" dimension
    if (dimension === "Ungrouped") {
      return {
        dimension,
        description: "Events that are not assigned to any specific dimension.",
        identifiers: { AND: [], OR: [] },
        events: data.events,
        eventDetails: includeEventDetails ? data.eventDetails : undefined
      };
    }

    // Normal handling for other dimensions
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
  const allFormattedOutputs: DimensionData[] = [];

  // Process each generation config separately
  config.generates.forEach(genConfig => {
    const { globals: currentGlobals, events } = readGenerationConfigFiles(genConfig);
    const { dimensionMap, dimensionEventCounts } = initializeDimensionMaps(currentGlobals);

    // Process each event in the current config
    Object.entries(events.events).forEach(([eventKey, event]) => {
      processEvent(eventKey, event, dimensionMap, dimensionEventCounts);
    });

    // Format the output for the current config
    const formattedOutput = formatDimensionOutput(dimensionMap, currentGlobals, options.includeEventDetails || options.verbose || false);
    allFormattedOutputs.push(...formattedOutput);
  });

  // Combine the formatted outputs from all configs
  return allFormattedOutputs;
}
