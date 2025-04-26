import fs from "fs";
import path from "path";
import { Command } from "commander";
import { type AnalyticsGlobals, type AnalyticsEvents, type GenerationConfig, type AnalyticsSchemaProperty } from "../../types";
import { validateAnalyticsFiles } from "../validation";
import { getAnalyticsConfig, readGenerationConfigFiles } from "../utils/analyticsConfigHelper";

interface TrackingConfigProperty {
  name: string;
  type: string | string[];
  optional?: boolean;
  value?: any;
}

interface TrackingConfig {
  events: Record<string, {
    name: string;
    properties: TrackingConfigProperty[];
  }>;
  groups: Record<string, {
    name: string;
    properties: TrackingConfigProperty[];
    identifiedBy?: string;
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
function generateEventConfigs(trackingConfig: TrackingConfig, events: AnalyticsEvents, includeComments: boolean): string {
  return Object.entries(trackingConfig.events)
    .map(([key, event]) => {
      const normalizedKey = normalizeEventKey(key);
      const originalEvent = events.events[key];
      const comment = includeComments && originalEvent.description 
        ? `/** ${originalEvent.description} */\n` 
        : '';
      return `${comment}export const ${normalizedKey}Event = {
  name: '${event.name}',
  properties: [
    ${event.properties.map(prop => `{
      name: '${prop.name}',
      type: ${Array.isArray(prop.type) ? JSON.stringify(prop.type) : `'${prop.type}'`}${prop.value !== undefined ? `,\n      value: ${JSON.stringify(prop.value)}` : ''}
    }`).join(',\n    ')}
  ]
};`;
    })
    .join('\n\n');
}

/**
 * Generates the tracking config object
 */
export function generateTrackingConfig(globals: any, events: any): string {
  const eventEntries = Object.entries(events.events || {})
    .map(([key, event]: [string, any]) => {
      return `    ${key}: {
      name: '${event.name}',
      properties: [
        ${event.properties?.map((prop: any) => `{
          name: '${prop.name}',
          type: ${Array.isArray(prop.type) ? JSON.stringify(prop.type) : `'${prop.type}'`}${prop.value !== undefined ? `,\n          value: ${JSON.stringify(prop.value)}` : ''}
        }`).join(',\n        ')}
      ]
    }`;
    })
    .join(',\n');

  const groupsConfig = globals.groups.map((group: any) => {
    const propertyEntries = group.properties.map((prop: any) => {
      const type = Array.isArray(prop.type) ? JSON.stringify(prop.type) : `'${prop.type}'`;
      return `        {
          name: '${prop.name}',
          type: ${type}${prop.value !== undefined ? `,\n          value: ${JSON.stringify(prop.value)}` : ''}
        }`;
    }).join(',\n');

    return `    '${group.name}': {
      name: '${group.name}',
      properties: [
${propertyEntries}
      ]${group.identifiedBy ? `,\n      identifiedBy: '${group.identifiedBy}'` : ''}
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
    const properties = event.properties?.map((prop) => {
      const type = Array.isArray(prop.type) ? prop.type.map((t: string) => `'${t}'`).join(' | ') : prop.type;
      // Make properties with default values optional
      const isOptional = prop.optional || prop.value !== undefined;
      return `'${prop.name}'${isOptional ? '?' : ''}: ${type} | (() => ${type})`;
    }).join('; ') || '';

    return `    ${key}: {
      name: '${event.name}';
      properties: { ${properties} };
    };`;
  }).join('\n\n');

  const groupTypes = globals.groups.map((group) => {
    const properties = group.properties.map((prop) => {
      const type = Array.isArray(prop.type) ? prop.type.map((t: string) => `'${t}'`).join(' | ') : prop.type;
      // Make properties with default values optional
      const isOptional = prop.optional || prop.value !== undefined;
      return `${prop.name}${isOptional ? '?' : ''}: ${type} | (() => ${type})`;
    }).join('; ');

    return `    ${group.name}: {
      name: '${group.name}';
      properties: { ${properties} };${group.identifiedBy ? `\n      identifiedBy: '${group.identifiedBy}';` : ''}
    };`;
  }).join('\n\n');

  return `export interface TrackerEventBase {
  name: string;
  properties?: Array<{
    name: string;
    type: string | string[];
    optional?: boolean;
  }>;
  passthrough?: boolean;
}

export interface TrackerEvents {
  events: {
${eventTypes}
  };
  groups: {
${groupTypes}
  };
  globals: {
    dimensions: {
      [K: string]: {
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
      };
    };
  };
}

// Base types for type safety
export type TrackerEvent<T extends TrackerEvents> = ${Object.keys(events.events).map(k => `'${k}'`).join(' | ')};
export type TrackerGroup<T extends TrackerEvents> = ${globals.groups.map(g => `'${g.name}'`).join(' | ')};

export type EventProperties<T extends TrackerEvents, E extends TrackerEvent<T>> = T['events'][E]['properties'];
export type GroupProperties<T extends TrackerEvents, G extends TrackerGroup<T>> = T['groups'][G]['properties'];

export interface AnalyticsTracker<T extends TrackerEvents> {
  track: <E extends TrackerEvent<T>>(eventKey: E, eventProperties: EventProperties<T, E>) => void;
  setProperties: <G extends TrackerGroup<T>>(groupName: G, properties: T['groups'][G]['properties']) => void;
  getProperties: () => { [K in TrackerGroup<T>]: T['groups'][K]['properties'] };
}

export interface TrackerOptions<T extends TrackerEvents> {
  onEventTracked: <E extends TrackerEvent<T>>(
    eventName: T['events'][E]['name'],
    eventProperties: T['events'][E]['properties'],
    groupProperties: Record<TrackerGroup<T>, GroupProperties<T, TrackerGroup<T>>>,
  ) => void;
  onGroupUpdated: <G extends TrackerGroup<T>>(
    groupName: T['groups'][G]['name'],
    properties: T['groups'][G]['properties'],
  ) => void;
  onError?: (error: Error) => void;
}`;
}

function getPropertyType(type: string | string[]): string {
  if (Array.isArray(type)) {
    return type.map(t => {
      if (typeof t === 'string' && !['string', 'number', 'boolean', 'string[]', 'number[]', 'boolean[]'].includes(t)) {
        return `'${t}'`;
      }
      return t;
    }).join(' | ');
  }
  if (typeof type === 'string' && !['string', 'number', 'boolean', 'string[]', 'number[]', 'boolean[]'].includes(type)) {
    return `'${type}'`;
  }
  return type;
}

function generateJavaScriptOutput(trackingConfig: TrackingConfig, events: AnalyticsEvents, includeComments: boolean, outputPath: string) {
  const jsOutput = `
// 🔹 Event Configurations
${generateEventConfigs(trackingConfig, events, includeComments)}

${generateTrackingConfig({ groups: [], dimensions: [], events: {} }, { groups: [], dimensions: [], events: {} })}
`;

  fs.writeFileSync(outputPath, jsOutput);
  console.log(`✅ Generated tracking config in ${outputPath}`);
}

function generateTypeScriptOutput(trackingConfig: TrackingConfig, events: AnalyticsEvents, includeComments: boolean, outputPath: string, genConfig: GenerationConfig) {
  const { globals } = readGenerationConfigFiles(genConfig);
  if (!globals) {
    throw new Error('Failed to read globals configuration');
  }

  const analyticsTypes = `// 🔹 Event Types & Configurations

${generateEventConfigs(trackingConfig, events, includeComments)}

// 🔹 Generated Types
${generateTypeDefinitions(events, globals)}

${generateTrackingConfig(globals, events)}`;
  fs.writeFileSync(outputPath, analyticsTypes.trim() + '\n');
  console.log(`✅ Generated tracking config and TypeScript definitions in ${outputPath}`);
}

export function registerGenerateCommand(program: Command) {
  program
    .command("generate")
    .description("Generate tracking configs & TypeScript types from analytics files")
    .action(() => {
      console.log("🔍 Running validation before generating...");
      if (!validateAnalyticsFiles()) return;

      const config = getAnalyticsConfig();

      // Process each generation config
      for (const genConfig of config.generates) {
        const outputPath = path.resolve(process.cwd(), genConfig.output);
        const outputDir = path.dirname(outputPath);
        const outputExt = path.extname(outputPath).toLowerCase();

        const { events } = readGenerationConfigFiles(genConfig);

        // Combine groups from all group files
        const allGroups: Record<string, any> = {};
        if (genConfig.groups) {
          for (const groupFile of genConfig.groups) {
            const groupPath = path.resolve(process.cwd(), groupFile);
            const groupContent = JSON.parse(fs.readFileSync(groupPath, 'utf-8'));
            if (groupContent.groups) {
              Object.assign(allGroups, groupContent.groups);
            }
          }
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
                  value: prop.value
                })) || []
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
                  value: prop.value
                })) || [],
                identifiedBy: group.identifiedBy
              }
            ])
          )
        };

        // Generate output based on file extension
        if (outputExt === ".ts" || outputExt === ".tsx") {
          generateTypeScriptOutput(trackingConfig, events, !genConfig.disableComments, outputPath, genConfig);
        } else {
          generateJavaScriptOutput(trackingConfig, events, !genConfig.disableComments, outputPath);
        }
      }
    });
}