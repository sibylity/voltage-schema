import fs from "fs";
import path from "path";
import { Command } from "commander";
import { type AnalyticsGlobals, type AnalyticsEvents, type GenerationConfig, type AnalyticsSchemaProperty } from "../../types";
import { validateAnalyticsFiles } from "../validation";
import { getAnalyticsConfig, readGenerationConfigFiles } from "../utils/analyticsConfigHelper";
import { parseSchemaFile } from "../validation/fileValidation";

interface TrackingConfigProperty {
  name: string;
  type: string | string[];
  optional?: boolean;
  defaultValue?: string | number | boolean;
  description?: string;
}

interface TrackingConfig {
  events: Record<string, {
    name: string;
    properties: TrackingConfigProperty[];
    passthrough?: boolean;
    meta?: Record<string, string | number | boolean>;
  }>;
  groups: Record<string, {
    name: string;
    properties: TrackingConfigProperty[];
    identifiedBy?: string;
    passthrough?: boolean;
  }>;
}

/**
 * Normalizes an event key to be safe for use as a variable name.
 * Converts to CamelCase and removes unsafe characters.
 * Example: "page_view" -> "pageView", "3d-render!" -> "threeDRender"
 */
function normalizeEventKey(key: string): string {
  // Handle numbers at the start
  key = key.replace(/^\d+/, match => {
    const numberWords = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
    return match.split('').map(digit => numberWords[parseInt(digit)]).join('');
  });

  // Split on any non-alphanumeric characters
  const words = key.split(/[^a-zA-Z0-9]+/);

  // Convert to CamelCase
  return words.map((word, index) => {
    if (!word) return '';
    return index === 0
      ? word.toLowerCase()
      : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join('');
}

/**
 * Generates event configurations with optional JSDoc comments
 */
function generateEventConfigs(trackingConfig: TrackingConfig, events: AnalyticsEvents, includeComments: boolean, eventKeyPropertyName: string = 'Event Key'): string {
  return Object.entries(trackingConfig.events)
    .map(([key, event]) => {
      const normalizedKey = normalizeEventKey(key);
      const originalEvent = events.events[key];
      const comment = includeComments && originalEvent.description
        ? `/** ${originalEvent.description} */\n`
        : '';

      // Create a map of property descriptions from the original event
      const propertyDescriptions = new Map(
        originalEvent.properties?.map(prop => [prop.name, prop.description]) || []
      );

      return `${comment}export const ${normalizedKey}Event = {
  name: '${event.name}',
  properties: [
    ${includeComments ? `/** The key that is used to track the "${key}" implementation of the "${event.name}" event. */\n    ` : ''}{
      name: '${eventKeyPropertyName}',
      type: 'string',
      defaultValue: '${key}'
    }${event.properties && event.properties.length > 0 ? ',\n    ' + event.properties.map(prop => {
      const propComment = includeComments && propertyDescriptions.get(prop.name) ? `/** ${propertyDescriptions.get(prop.name)} */\n    ` : '';
      return `${propComment}{
      name: '${prop.name}',
      type: ${Array.isArray(prop.type) ? JSON.stringify(prop.type) : `'${prop.type}'`}${prop.defaultValue !== undefined ? `,\n      defaultValue: ${JSON.stringify(prop.defaultValue)}` : ''}
    }`;
    }).join(',\n    ') : ''}
  ]${event.meta ? `,\n  meta: ${JSON.stringify(event.meta)}` : ''}
};`;
    })
    .join('\n\n');
}

/**
 * Generates the tracking config object
 */
export function generateTrackingConfig(globals: any, events: any, includeComments: boolean, eventKeyPropertyName: string = 'Event Key'): string {
  const eventEntries = Object.entries(events.events || {})
    .map(([key, event]: [string, any]) => {
      const eventComment = includeComments && event.description && event.description.length > 0 ? `    /** ${event.description} */\n` : '';

      // Create a map of property descriptions from the original event
      const propertyDescriptions = new Map(
        event.properties?.map((prop: any) => [prop.name, prop.description]) || []
      );

      return `${eventComment}    ${key}: {
      name: '${event.name}',
      properties: [
        ${includeComments ? `/** The key that is used to track the "${key}" implementation of the "${event.name}" event. */\n        ` : ''}{
          name: '${eventKeyPropertyName}',
          type: 'string',
          defaultValue: '${key}'
        }${event.properties && event.properties.length > 0 ? ',\n        ' + event.properties.map((prop: any) => {
          const propComment = includeComments && propertyDescriptions.get(prop.name) ? `/** ${propertyDescriptions.get(prop.name)} */\n        ` : '';
          return `${propComment}{
          name: '${prop.name}',
          type: ${Array.isArray(prop.type) ? JSON.stringify(prop.type) : `'${prop.type}'`}${prop.defaultValue !== undefined ? `,\n          defaultValue: ${JSON.stringify(prop.defaultValue)}` : ''}
        }`;
        }).join(',\n        ') : ''}
      ]${event.passthrough ? ',\n      passthrough: true' : ''}${event.meta ? `,\n      meta: ${JSON.stringify(event.meta)}` : ''}
    }`;
    })
    .join(',\n');

  const groupsConfig = globals.groups.map((group: any) => {
    const groupComment = includeComments && group.description && group.description.length > 0 ? `    /** ${group.description} */\n` : '';
    const hasProperties = group.properties && group.properties.length > 0 &&
      !group.properties.every((prop: any) => prop === undefined);

    // Create a map of property descriptions from the original group
    const propertyDescriptions = new Map(
      group.properties?.map((prop: any) => [prop.name, prop.description]) || []
    );

    const propertyEntries = hasProperties ? group.properties.map((prop: any) => {
      const propComment = includeComments && propertyDescriptions.get(prop.name) ? `/** ${propertyDescriptions.get(prop.name)} */\n        ` : '';
      const type = Array.isArray(prop.type) ? JSON.stringify(prop.type) : `'${prop.type}'`;
      return `${propComment}{
          name: '${prop.name}',
          type: ${type}${prop.defaultValue !== undefined ? `,\n          defaultValue: ${JSON.stringify(prop.defaultValue)}` : ''}
        }`;
    }).join(',\n') : '';

    return `${groupComment}    '${group.name}': {
      name: '${group.name}',
      properties: [
${propertyEntries}
      ]${group.identifiedBy ? `,\n      identifiedBy: '${group.identifiedBy}'` : ''}${group.passthrough ? ',\n      passthrough: true' : ''}
    }`;
  }).join(',\n');

  return `export const trackingConfig = {
  events: {
${eventEntries}
  },
  groups: {
${groupsConfig}
  }
};`;
}

/**
 * Generates TypeScript interface definitions
 */
function generateTypeDefinitions(events: AnalyticsEvents, globals: AnalyticsGlobals): string {
  const eventTypes = Object.entries(events.events).map(([key, event]) => {
    let properties = event.properties?.length
      ? `{ ${event.properties.map((prop) => {
          const type = Array.isArray(prop.type) ? prop.type.map((t: string) => `'${t}'`).join(' | ') : prop.type;
          // Make properties with default values optional
          const isOptional = prop.optional || prop.defaultValue !== undefined;
          return `'${prop.name}'${isOptional ? '?' : ''}: ${type} | (() => ${type})`;
        }).join('; ')} }`
      : 'Record<string, never>';

    // Add index signature for passthrough events
    if (event.passthrough) {
      properties = properties === 'Record<string, never>'
        ? '{ [key: string]: any }'
        : properties.replace(/}$/, '; [key: string]: any }');
    }

    // Always add meta as optional Record type
    const metaType = '\n      meta?: Record<string, string | number | boolean>;' ;

    return `    ${key}: {
      name: '${event.name}';
      properties: ${properties};${metaType}
    };`;
  }).join('\n\n');

  const groupTypes = globals.groups.map((group) => {
    let properties = group.properties?.length
      ? `{ ${group.properties.map((prop) => {
          const type = Array.isArray(prop.type) ? prop.type.map((t: string) => `'${t}'`).join(' | ') : prop.type;
          // Make properties with default values optional
          const isOptional = prop.optional || prop.defaultValue !== undefined;
          return `${prop.name}${isOptional ? '?' : ''}: ${type} | (() => ${type})`;
        }).join('; ')} }`
      : 'Record<string, never>';

    // Add index signature for passthrough groups
    if (group.passthrough) {
      properties = properties === 'Record<string, never>'
        ? '{ [key: string]: any }'
        : properties.replace(/}$/, '; [key: string]: any }');
    }

    return `    ${group.name}: {
      name: '${group.name}';
      properties: ${properties};${group.identifiedBy ? `\n      identifiedBy: '${group.identifiedBy}';` : ''}
    };`;
  }).join('\n\n');

  return `export interface TrackerEventBase {
  name: string;
  properties?: Array<{
    name: string;
    type: string | string[];
    optional?: boolean;
  }>;
  meta?: Record<string, string | number | boolean>;
  passthrough?: boolean;
}

export interface TrackerEvents {
  events: {
${eventTypes}
  };
  groups: {
${groupTypes}
  };
}

// Base types for type safety
export type TrackerEvent = ${Object.keys(events.events).map(k => `'${k}'`).join(' | ')};
export type TrackerGroup = ${globals.groups.map(g => `'${g.name}'`).join(' | ')};

export type EventProperties<T extends TrackerEvents, E extends TrackerEvent> = T['events'][E]['properties'];
export type EventMeta<T extends TrackerEvents, E extends TrackerEvent> = T['events'][E]['meta'];
export type GroupProperties<T extends TrackerEvents, G extends TrackerGroup> = T['groups'][G]['properties'];

// Helper type to determine if an event has properties
type HasProperties<T extends TrackerEvents, E extends TrackerEvent> = EventProperties<T, E> extends Record<string, never> ? false : true;

export interface AnalyticsTracker<T extends TrackerEvents> {
  track: <E extends TrackerEvent>(
    eventKey: E,
    ...args: HasProperties<T, E> extends true ? [eventProperties: EventProperties<T, E>] : []
  ) => void;
  setProperties: <G extends TrackerGroup>(groupName: G, properties: T['groups'][G]['properties']) => void;
  getProperties: () => { [K in TrackerGroup]: T['groups'][K]['properties'] };
}

export interface TrackerOptions<T extends TrackerEvents> {
  onEventTracked: <E extends TrackerEvent>(
    eventName: T['events'][E]['name'],
    eventData: {
      properties: T['events'][E]['properties'];
      meta?: T['events'][E]['meta'];
      groups: Record<TrackerGroup, GroupProperties<T, TrackerGroup>>;
    }
  ) => void;
  onGroupUpdated: <G extends TrackerGroup>(
    groupName: T['groups'][G]['name'],
    properties: T['groups'][G]['properties']
  ) => void;
  onError?: (error: Error) => void;
}`;
}

function generateJavaScriptOutput(trackingConfig: TrackingConfig, events: AnalyticsEvents, includeComments: boolean, outputPath: string, eventKeyPropertyName: string = 'Event Key') {
  const jsOutput = `
// 🔹 Event Configurations
${generateEventConfigs(trackingConfig, events, includeComments, eventKeyPropertyName)}

${generateTrackingConfig({ groups: [], dimensions: [], events: {} }, { groups: [], dimensions: [], events: {} }, includeComments, eventKeyPropertyName)}
`;

  fs.writeFileSync(outputPath, jsOutput);
  console.log(`✅ Generated tracking config in ${outputPath}`);
}

function generateTypeScriptOutput(trackingConfig: TrackingConfig, events: AnalyticsEvents, includeComments: boolean, outputPath: string, genConfig: GenerationConfig) {
  const { globals } = readGenerationConfigFiles(genConfig);
  if (!globals) {
    throw new Error('Failed to read globals configuration');
  }

  const eventKeyPropertyName = genConfig.eventKeyPropertyName || 'Event Key';

  const analyticsTypes = `// 🔹 Event Types & Configurations

${generateEventConfigs(trackingConfig, events, includeComments, eventKeyPropertyName)}

// 🔹 Generated Types
${generateTypeDefinitions(events, globals)}

${generateTrackingConfig(globals, events, includeComments, eventKeyPropertyName)}`;
  fs.writeFileSync(outputPath, analyticsTypes.trim() + '\n');
  console.log(`✅ Generated tracking config and TypeScript definitions in ${outputPath}`);
}

export function registerGenerateCommand(program: Command) {
  program
    .command("generate")
    .description("Generate TypeScript types & tracking config from your codegen config")
    .action(() => {
      console.log("🔍 Validating voltage.config.json...");
      const config = getAnalyticsConfig();

      try {
        if (!validateAnalyticsFiles()) return;

        // Process each generation config
        config.generates.forEach(genConfig => {
          const outputPath = path.resolve(process.cwd(), genConfig.output);
          const outputDir = path.dirname(outputPath);
          const outputExt = path.extname(outputPath).toLowerCase();

          const { events } = readGenerationConfigFiles(genConfig);

          // Combine groups from all group files
          const allGroups: Record<string, any> = {};
          if (genConfig.groups) {
            genConfig.groups.forEach(groupFile => {
              const groupPath = path.resolve(process.cwd(), groupFile);
              const groupResult = parseSchemaFile<AnalyticsGlobals>(groupPath);
              if (!groupResult.isValid || !groupResult.data) {
                console.error(`❌ Failed to parse group file at ${groupPath}:`, groupResult.errors);
                process.exit(1);
              }
              if (groupResult.data.groups) {
                Object.assign(allGroups, groupResult.data.groups);
              }
            });
          }

          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }

          console.log(`📁 Generating files in ${outputDir}...`);

          // Generate trackingConfig object without descriptions
          const trackingConfig: TrackingConfig = {
            events: Object.fromEntries(
              Object.entries(events.events).map(([eventKey, event]) => [
                eventKey,
                {
                  name: event.name,
                  properties: event.properties?.map((prop: AnalyticsSchemaProperty) => ({
                    name: prop.name,
                    type: prop.type,
                    optional: prop.optional,
                    defaultValue: prop.defaultValue
                  })) || [],
                  passthrough: event.passthrough,
                  meta: event.meta
                }
              ])
            ),
            groups: Object.fromEntries(
              Object.entries(allGroups).map(([groupName, group]) => [
                groupName,
                {
                  name: group.name,
                  properties: group.properties?.map((prop: AnalyticsSchemaProperty) => ({
                    name: prop.name,
                    type: prop.type,
                    optional: prop.optional,
                    defaultValue: prop.defaultValue
                  })) || [],
                  identifiedBy: group.identifiedBy,
                  passthrough: group.passthrough
                }
              ])
            )
          };

          // Generate output based on file extension
          if (outputExt === ".ts" || outputExt === ".tsx") {
            generateTypeScriptOutput(trackingConfig, events, !genConfig.disableComments, outputPath, genConfig);
          } else {
            generateJavaScriptOutput(trackingConfig, events, !genConfig.disableComments, outputPath, genConfig.eventKeyPropertyName);
          }
        });
      } catch (error) {
        console.error(error);
        process.exit(1);
      }
    });
}
