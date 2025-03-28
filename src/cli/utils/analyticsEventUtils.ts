import { type AnalyticsConfig, type AnalyticsEvents, type AnalyticsGlobals, type AnalyticsSchemaProperty, type Dimension } from "../../types";
import { getAnalyticsConfig, readGenerationConfigFiles } from "./analyticsConfigHelper";

export interface EventProperty extends AnalyticsSchemaProperty {
  source: "event" | "group";
}

export interface EventDimension {
  name: string;
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
}

export interface EventOutput {
  key: string;
  name: string;
  description: string;
  version?: string;
  dimensions?: EventDimension[];
  properties: EventProperty[];
  passthrough?: boolean;
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
  dimensions?: Dimension[]
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
        source: "group" as const
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

  const output: EventOutput = {
    key: eventKey,
    name: event.name,
    description: event.description,
    version: event.version,
    properties: allProperties,
    passthrough: event.passthrough
  };

  if (includeDimensions && dimensions && event.dimensions) {
    output.dimensions = event.dimensions
      .map(dimName => getDimensionDetails(dimName, dimensions))
      .filter((dim): dim is EventDimension => dim !== undefined);
  }

  return output;
}

export function getAllEvents(options: GetAllEventsOptions = {}): EventOutput[] {
  const { includeGroups = false, includeDimensions = false, verbose = false } = options;
  const effectiveIncludeGroups = verbose || includeGroups;
  const effectiveIncludeDimensions = verbose || includeDimensions;

  const config = getAnalyticsConfig();
  const events: EventOutput[] = [];

  // Process all generation configs
  for (const genConfig of config.generates) {
    const { events: eventsData, globals } = readGenerationConfigFiles(genConfig);

    // Process each event
    Object.entries(eventsData.events).forEach(([eventKey, event]) => {
      events.push(processEvent(
        eventKey, 
        event, 
        effectiveIncludeGroups,
        effectiveIncludeDimensions,
        globals.groups,
        globals.dimensions
      ));
    });
  }

  // Sort events alphabetically by name
  events.sort((a, b) => a.name.localeCompare(b.name));

  return events;
} 