import { type AnalyticsEvents, type AnalyticsGlobals, type AnalyticsSchemaProperty, type Dimension } from "../../types";
import { getAnalyticsConfig, readGenerationConfigFiles } from "./analyticsConfigHelper";

export interface EventProperty extends AnalyticsSchemaProperty {
  source: "event" | "group";
  groupName?: string;
}

export interface EventDimension {
  name: string;
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
}

export interface EventOutput {
  key: string;
  name: string;
  description: string;
  dimensions?: EventDimension[];
  properties: EventProperty[];
  passthrough?: boolean;
  meta?: Record<string, string | number | boolean>;
}

interface GetAllEventsOptions {
  includeGroups?: boolean;
  includeDimensions?: boolean;
  verbose?: boolean;
}

function getDimensionDetails(dimensionName: string, dimensions: Dimension[]): EventDimension | undefined {
  return dimensions.find(dim => dim.name === dimensionName);
}

function processEvent(
  eventKey: string,
  event: AnalyticsEvents["events"][string],
  includeGroups: boolean,
  includeDimensions: boolean,
  groups?: AnalyticsGlobals["groups"],
  dimensions?: Dimension[],
  metaRules?: AnalyticsGlobals["meta"]
): EventOutput {
  const eventProperties = (event.properties || []).map(prop => ({
    ...prop,
    source: "event" as const
  })) as EventProperty[];

  let allProperties = [...eventProperties];

  if (includeGroups && groups) {
    const groupProperties = groups.flatMap(group =>
      (group.properties || []).map(prop => ({
        ...prop,
        source: "group" as const,
        groupName: group.name
      }))
    ) as EventProperty[];

    // Merge properties, keeping event properties if there's a name conflict
    const propertyMap = new Map<string, EventProperty>();
    groupProperties.forEach(prop => {
      if (!propertyMap.has(prop.name)) {
        propertyMap.set(prop.name, prop);
      }
    });
    eventProperties.forEach(prop => {
      propertyMap.set(prop.name, prop);
    });

    allProperties = Array.from(propertyMap.values());
  }

  // Initialize meta with defaultValues from meta rules
  const meta: Record<string, string | number | boolean> = {};
  if (metaRules) {
    // Always include all meta rules in the events command output
    metaRules.forEach(rule => {
      if (rule.defaultValue !== undefined) {
        meta[rule.name] = rule.defaultValue;
      }
    });
  }

  // Merge with any explicit meta values from the event
  if (event.meta) {
    Object.assign(meta, event.meta);
  }

  const output: EventOutput = {
    key: eventKey,
    name: event.name,
    description: event.description,
    properties: allProperties,
    passthrough: event.passthrough,
    meta: Object.keys(meta).length > 0 ? meta : undefined
  };

  if (includeDimensions && dimensions) {
    // If event has no dimensions field, include it in all dimensions
    if (!event.dimensions) {
      // Include all actual dimensions
      output.dimensions = dimensions.map(dim => ({
        name: dim.name,
        description: dim.description,
        identifiers: dim.identifiers || { AND: [], OR: [] }
      }));
    }
    // If event has an empty dimensions array, add it to "Ungrouped" dimension
    else if (Array.isArray(event.dimensions) && event.dimensions.length === 0) {
      // Add a special "Ungrouped" dimension to indicate this event has no dimensions
      output.dimensions = [
        {
          name: "Ungrouped",
          description: "Events with explicit empty dimensions array",
          identifiers: { AND: [], OR: [] }
        }
      ];
    }
    // If event has explicit dimensions
    else if (Array.isArray(event.dimensions)) {
      output.dimensions = event.dimensions
        .map((dimName: string) => getDimensionDetails(dimName, dimensions))
        .filter((dim): dim is EventDimension => dim !== undefined);
    }
    // Handle the new dimensions format with included/excluded arrays
    else if (typeof event.dimensions === 'object') {
      const dimensionsObj = event.dimensions as { included?: string[]; excluded?: string[] };

      if (dimensionsObj.included && Array.isArray(dimensionsObj.included)) {
        output.dimensions = dimensionsObj.included
          .map((dimName: string) => getDimensionDetails(dimName, dimensions))
          .filter((dim): dim is EventDimension => dim !== undefined);
      } else if (dimensionsObj.excluded && Array.isArray(dimensionsObj.excluded)) {
        // For excluded dimensions, we need to include all dimensions except the excluded ones
        const excludedDims = new Set(dimensionsObj.excluded);
        output.dimensions = dimensions
          .filter(dim => !excludedDims.has(dim.name))
          .map(dim => ({
            name: dim.name,
            description: dim.description,
            identifiers: dim.identifiers || { AND: [], OR: [] }
          }));
      }
    }
  }

  return output;
}

export function getAllEvents(options: GetAllEventsOptions = {}): EventOutput[] {
  const effectiveIncludeGroups = options.includeGroups ?? true;
  const effectiveIncludeDimensions = options.includeDimensions ?? true;

  // Process all generation configs
  const config = getAnalyticsConfig();
  const events: EventOutput[] = [];

  config.generates.forEach(genConfig => {
    const { events: eventsData, globals } = readGenerationConfigFiles(genConfig);

    // Process each event
    Object.entries(eventsData.events).forEach(([eventKey, event]) => {
      events.push(processEvent(
        eventKey,
        event,
        effectiveIncludeGroups,
        effectiveIncludeDimensions,
        globals.groups,
        globals.dimensions,
        globals.meta
      ));
    });
  });

  // Sort events alphabetically by name
  events.sort((a, b) => a.name.localeCompare(b.name));

  return events;
}
