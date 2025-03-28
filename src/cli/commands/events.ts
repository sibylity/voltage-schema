import { Command } from "commander";
import { type AnalyticsConfig, type AnalyticsEvents, type AnalyticsGlobals, type AnalyticsSchemaProperty, type Dimension } from "../../types";
import { validateAnalyticsFiles } from "../validation";
import { getAnalyticsConfig, readGenerationConfigFiles } from "../utils/analyticsConfigHelper";

interface EventProperty extends AnalyticsSchemaProperty {
  source: "event" | "group";
}

interface EventDimension {
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

interface EventOutput {
  key: string;
  name: string;
  description: string;
  version?: string;
  dimensions?: EventDimension[];
  properties: EventProperty[];
  passthrough?: boolean;
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

export function registerEventsCommand(program: Command) {
  program
    .command("events")
    .description("List all events with their properties and dimensions")
    .option("--include-groups", "Include properties from all groups")
    .option("--include-dimensions", "Include detailed dimension information")
    .action((options) => {
      try {
        console.log("🔍 Running validation before listing events...");
        if (!validateAnalyticsFiles()) {
          process.exit(1);
        }

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
              options.includeGroups,
              options.includeDimensions,
              globals.groups,
              globals.dimensions
            ));
          });
        }

        // Sort events alphabetically by name
        events.sort((a, b) => a.name.localeCompare(b.name));

        // Format and output results
        console.log(JSON.stringify(events, null, 2));
      } catch (error) {
        console.error("❌ Error processing events:", error);
        process.exit(1);
      }
    });
} 