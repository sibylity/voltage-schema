import { getAnalyticsConfig, readGenerationConfigFiles } from "./analyticsConfigHelper";
import { type AnalyticsEvents, type AnalyticsGlobals, type Property } from "../../types";

export interface PropertySource {
  type: "event" | "group";
  name: string;
  description?: string;
  optional?: boolean;
  defaultValue?: string | number | boolean;
}

export interface PropertyData {
  property: string;
  types: (string | string[])[];
  sources: PropertySource[];
  defaultValue?: string | number | boolean;
}

interface PropertyMap {
  [propertyName: string]: {
    types: Set<string | string[]>;
    sources: PropertySource[];
    defaultValue?: string | number | boolean;
  };
}

function processProperty(
  property: Property,
  sourceName: string,
  sourceDescription: string,
  sourceType: "event" | "group",
  propertyMap: PropertyMap
): void {
  if (!propertyMap[property.name]) {
    propertyMap[property.name] = {
      types: new Set(),
      sources: [],
      defaultValue: property.defaultValue
    };
  }

  // Add the type to the set of types
  propertyMap[property.name].types.add(property.type);

  propertyMap[property.name].sources.push({
    type: sourceType,
    name: sourceName,
    description: sourceDescription,
    optional: property.optional,
    defaultValue: property.defaultValue
  });
}

function processEvent(
  eventKey: string,
  event: AnalyticsEvents["events"][string],
  propertyMap: PropertyMap
): void {
  if (!event.properties) return;

  event.properties.forEach((prop) => {
    processProperty(prop, eventKey, event.description, "event", propertyMap);
  });
}

function processGroup(
  groupKey: string,
  group: AnalyticsGlobals["groups"][number],
  propertyMap: PropertyMap
): void {
  group.properties.forEach((prop) => {
    processProperty(prop, groupKey, group.description, "group", propertyMap);
  });
}

function formatPropertyOutput(propertyMap: PropertyMap): PropertyData[] {
  return Object.entries(propertyMap).map(([property, data]) => ({
    property,
    types: Array.from(data.types),
    sources: data.sources,
    defaultValue: data.defaultValue
  }));
}

interface GetAllPropertiesOptions {
  verbose?: boolean;
}

export function getAllProperties(options: GetAllPropertiesOptions = {}): PropertyData[] {
  const config = getAnalyticsConfig();
  const propertyMap: PropertyMap = {};

  // Process all generation configs
  for (const genConfig of config.generates) {
    const { globals, events } = readGenerationConfigFiles(genConfig);

    // Process each event
    Object.entries(events.events).forEach(([eventKey, event]) => {
      processEvent(eventKey, event, propertyMap);
    });

    // Process each group
    globals.groups.forEach((group) => {
      processGroup(group.name, group, propertyMap);
    });
  }

  return formatPropertyOutput(propertyMap);
} 