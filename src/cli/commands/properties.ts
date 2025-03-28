import { Command } from "commander";
import { type AnalyticsConfig, type AnalyticsEvents, type AnalyticsGlobals, type Property } from "../../types";
import { validateAnalyticsFiles } from "../validation";
import { getAnalyticsConfig, readGenerationConfigFiles } from "../utils/analyticsConfigHelper";

interface PropertySource {
  type: "event" | "group";
  name: string;
  description?: string;
  optional?: boolean;
}

interface PropertyMap {
  [propertyName: string]: {
    types: Set<string | string[]>;
    sources: PropertySource[];
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
      sources: []
    };
  }

  // Add the type to the set of types
  propertyMap[property.name].types.add(property.type);

  propertyMap[property.name].sources.push({
    type: sourceType,
    name: sourceName,
    description: sourceDescription,
    optional: property.optional
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

function formatPropertyOutput(propertyMap: PropertyMap): Array<{
  property: string;
  types: (string | string[])[];
  sources: PropertySource[];
}> {
  return Object.entries(propertyMap).map(([property, data]) => ({
    property,
    types: Array.from(data.types),
    sources: data.sources
  }));
}

export function registerPropertiesCommand(program: Command) {
  program
    .command("properties")
    .description("List all properties across groups and events")
    .action(() => {
      try {
        console.log("🔍 Running validation before listing properties...");
        if (!validateAnalyticsFiles()) {
          process.exit(1);
        }

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

        // Format and output results
        const propertyList = formatPropertyOutput(propertyMap);
        console.log(JSON.stringify(propertyList, null, 2));
      } catch (error) {
        console.error("❌ Error processing properties:", error);
        process.exit(1);
      }
    });
} 