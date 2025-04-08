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
}

interface TrackingConfig {
  events: Record<string, {
    name: string;
    properties: TrackingConfigProperty[];
  }>;
  groups: Record<string, {
    name: string;
    properties: TrackingConfigProperty[];
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
        ? `\n/** ${originalEvent.description} */\n` 
        : '\n';
      return `${comment}export const ${normalizedKey}Event = ${JSON.stringify(event, null, 2)};`;
    })
    .join('\n\n');
}

/**
 * Generates the tracking config object
 */
function generateTrackingConfig(trackingConfig: TrackingConfig, globals: AnalyticsGlobals): string {
  return `// 🔹 Tracking Config Object
export const trackingConfig = {
  events: {
${Object.keys(trackingConfig.events)
    .map(key => `    "${key}": ${normalizeEventKey(key)}Event`)
    .join(',\n')}
  },
  groups: {
${Object.entries(globals.groups || {})
    .map(([_, group]) => `    "${group.name}": {
      name: "${group.name}",
      properties: ${JSON.stringify(group.properties)}${group.identifiedBy ? `,
      identifiedBy: "${group.identifiedBy}"` : ''}
    }`)
    .join(',\n')}
  }
};`;
}

/**
 * Generates TypeScript interface definitions
 */
function generateTypeDefinitions(events: AnalyticsEvents, globals: AnalyticsGlobals): string {
  // Generate the TrackerEvents interface content
  const eventEntries = Object.entries(events.events)
    .map(([key, event]) => {
      const propertyTypes = event.properties?.map(prop => {
        const type = Array.isArray(prop.type) ? prop.type : [prop.type];
        const tsType = type.map(t => {
          if (typeof t === 'string') {
            switch (t) {
              case 'string': return 'string';
              case 'number': return 'number';
              case 'boolean': return 'boolean';
              case 'string[]': return 'string[]';
              case 'number[]': return 'number[]';
              case 'boolean[]': return 'boolean[]';
              default: return `'${t}'`;
            }
          }
          return 'any';
        }).join(' | ');
        const valueType = prop.optional ? `(${tsType} | null | undefined)` : tsType;
        return `  "${prop.name}": ${valueType} | (() => ${valueType});`;
      }).join('\n') || '';
      return [
        `  "${key}": {`,
        `    name: "${event.name}";`,
        event.passthrough 
          ? `    properties: {${propertyTypes}\n} & Record<string, any>;`
          : `    properties: {${propertyTypes}\n};`,
        event.passthrough ? `    passthrough: true;` : '',
        '  };'
      ].join('\n');
    })
    .join('\n');

  // Generate literal union of group names
  const groupNames = Object.entries(globals.groups || {})
    .map(([_, group]) => `"${group.name}"`)
    .join(' | ');

  // Generate the Groups interface content
  const groupEntries = Object.entries(globals.groups || {})
    .map(([key, group]) => {
      const propertyTypes = group.properties?.map(prop => {
        const type = Array.isArray(prop.type) ? prop.type : [prop.type];
        const tsType = type.map(t => {
          if (typeof t === 'string') {
            switch (t) {
              case 'string': return 'string';
              case 'number': return 'number';
              case 'boolean': return 'boolean';
              case 'string[]': return 'string[]';
              case 'number[]': return 'number[]';
              case 'boolean[]': return 'boolean[]';
              default: return `'${t}'`;
            }
          }
          return 'any';
        }).join(' | ');
        const valueType = prop.optional ? `(${tsType} | null | undefined)` : tsType;
        return `  "${prop.name}": ${valueType} | (() => ${valueType});`;
      }).join('\n') || '';
      return [
        `  "${group.name}": {`,
        `    name: "${group.name}";`,
        group.passthrough 
          ? `    properties: {${propertyTypes}\n} & Record<string, any>;`
          : `    properties: {${propertyTypes}\n};`,
        group.passthrough ? `    passthrough: true;` : '',
        group.identifiedBy ? `    identifiedBy: "${group.identifiedBy}";` : '',
        '  };'
      ].join('\n');
    })
    .join('\n');

  // Generate literal union of event names
  const eventNames = Object.keys(events.events).length > 0
    ? Object.keys(events.events)
        .map(key => `"${key}"`)
        .join(' | ')
    : 'never';

  // Generate the AnalyticsTracker interface
  const analyticsTrackerInterface = [
    'export interface AnalyticsTracker<T extends TrackerEvents> {',
    '  track: <E extends TrackerEvent<T>>(',
    '    eventKey: E,',
    '    eventProperties: EventProperties<T, E>',
    '  ) => void;',
    '  setProperties: <G extends TrackerGroup<T>>(',
    '    groupName: G,',
    '    properties: T["groups"][G]["properties"]',
    '  ) => void;',
    '  getProperties: () => { [K in TrackerGroup<T>]: T["groups"][K]["properties"] };',
    '}'
  ].join('\n');

  // Generate the TrackerOptions interface
  const trackerOptionsInterface = [
    'export interface TrackerOptions<T extends TrackerEvents> {',
    '  onEventTracked: <E extends TrackerEvent<T>>(',
    '    eventName: T["events"][E]["name"],',
    '    eventProperties: T["events"][E]["properties"],',
    '    groupProperties: Record<TrackerGroup<T>, GroupProperties<T, TrackerGroup<T>>>',
    '  ) => void;',
    '  onGroupUpdate: <G extends TrackerGroup<T>>(',
    '    groupName: T["groups"][G]["name"],',
    '    properties: T["groups"][G]["properties"]',
    '  ) => void;',
    '  onError?: (error: Error) => void;',
    '}'
  ].join('\n');

  // Define the base types
  const baseTypes = [
    '// 🔹 Generated Types',
    'export interface TrackerEventBase {',
    '  name: string;',
    '  properties?: Array<{',
    '    name: string;',
    '    type: string | string[];',
    '    optional?: boolean;',
    '  }>;',
    '  passthrough?: boolean;',
    '}',
    '',
    'export interface TrackerEvents {',
    '  events: {',
    eventEntries,
    '  };',
    '  groups: {',
    groupEntries,
    '  };',
    '  globals: {',
    '    dimensions: {',
    '      [K: string]: {',
    '        name: string;',
    '        description: string;',
    '        identifiers: Array<{',
    '          property: string;',
    '          contains?: (string | number | boolean)[];',
    '          equals?: string | number | boolean;',
    '          not?: string | number | boolean;',
    '          in?: (string | number | boolean)[];',
    '          notIn?: (string | number | boolean)[];',
    '          startsWith?: string;',
    '          endsWith?: string;',
    '          lt?: number;',
    '          lte?: number;',
    '          gt?: number;',
    '          gte?: number;',
    '        }>;',
    '      };',
    '    };',
    '  };',
    '}',
    '',
    '// Base types for type safety',
    `export type TrackerEvent<T extends TrackerEvents> = ${eventNames};`,
    `export type TrackerGroup<T extends TrackerEvents> = ${groupNames};`,
    '',
    'export type EventProperties<T extends TrackerEvents, E extends TrackerEvent<T>> = T["events"][E]["properties"];',
    'export type GroupProperties<T extends TrackerEvents, G extends TrackerGroup<T>> = T["groups"][G]["properties"];',
    '',
    analyticsTrackerInterface,
    '',
    trackerOptionsInterface,
  ].join('\n');

  return baseTypes;
}

/**
 * Generates TypeScript type definitions for events
 */
function generateEventTypes(trackingConfig: TrackingConfig, events: AnalyticsEvents, includeComments: boolean): string {
  return Object.entries(trackingConfig.events)
    .map(([key, event]) => {
      const normalizedKey = normalizeEventKey(key);
      const originalEvent = events.events[key];
      const comment = includeComments && originalEvent.description 
        ? `/** ${originalEvent.description} */\n` 
        : '';
      
      const properties = event.properties
        .map(prop => {
          const type = getPropertyType(prop.type);
          const optional = prop.optional ? " | undefined | null" : "";
          return `  "${prop.name}": ${type}${optional};`;
        })
        .join('\n');
      
      return `
${comment}export type ${normalizedKey}EventProperties = {
${properties || '    // No properties'}
};`;
    })
    .join('\n\n');
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

${generateTrackingConfig(trackingConfig, { groups: [], dimensions: [] })}
`;

  fs.writeFileSync(outputPath, jsOutput);
  console.log(`✅ Generated tracking config in ${outputPath}`);
}

function generateTypeScriptOutput(trackingConfig: TrackingConfig, events: AnalyticsEvents, includeComments: boolean, outputPath: string, genConfig: GenerationConfig) {
  const { globals } = readGenerationConfigFiles(genConfig);
  if (!globals) {
    throw new Error('Failed to read globals configuration');
  }
  const analyticsTypes = `
// 🔹 Event Types & Configurations
${generateEventTypes(trackingConfig, events, includeComments)}

${generateEventConfigs(trackingConfig, events, includeComments)}

${generateTypeDefinitions(events, globals)}

${generateTrackingConfig(trackingConfig, globals)}
`;
  fs.writeFileSync(outputPath, analyticsTypes);
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
                  optional: prop.optional
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
                  optional: prop.optional
                })) || []
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