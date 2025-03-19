import fs from "fs";
import path from "path";
import { Command } from "commander";
import { type AnalyticsConfig, type AnalyticsGlobals, type AnalyticsEvents, type Event, type Property } from "../../types";
import { validateAnalyticsFiles } from "../validation";
import { getAnalyticsConfig, readGenerationConfigFiles } from "../utils/analyticsConfigHelper";
import { type ValidationResult } from "../validation/types";
import { validateAnalyticsConfig } from "../validation/validateAnalyticsConfig";
import { validateGlobals } from "../validation/validateAnalyticsGlobals";
import { validateEvents } from "../validation/validateAnalyticsEvents";

interface TrackingConfigProperty {
  name: string;
  type: string | string[];
  optional?: boolean;
}

interface TrackingConfigEvent {
  name: string;
  properties: TrackingConfigProperty[];
}

interface TrackingConfig {
  events: Record<string, {
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
function generateTrackingConfig(trackingConfig: TrackingConfig): string {
  return `// 🔹 Tracking Config Object
export const trackingConfig = {
  events: {
${Object.keys(trackingConfig.events)
    .map(key => `    "${key}": ${normalizeEventKey(key)}Event`)
    .join(',\n')}
  }
};`;
}

/**
 * Generates TypeScript interface definitions
 */
function generateTypeDefinitions(events: AnalyticsEvents): string {
  // Generate the TrackerEvents interface content
  const eventEntries = Object.entries(events.events)
    .map(([key, event]) => {
      const normalizedKey = normalizeEventKey(key);
      return [
        `  "${key}": {`,
        `    name: "${event.name}";`,
        `    properties: ${normalizedKey}EventProperties;`,
        '  };'
      ].join('\n');
    })
    .join('\n');

  // Generate literal union of event names
  const eventNames = Object.keys(events.events)
    .map(key => `"${key}"`)
    .join(' | ');

  // Define the base types
  const baseTypes = [
    '// 🔹 Generated Types',
    'export interface TrackerEventBase {',
    '  name: string;',
    '  properties?: Array<{',
    '    name: string;',
    '    type: string | string[];',
    '  }>;',
    '}',
    '',
    'export interface TrackerEvents {',
    '  [K: string]: {',
    '    name: string;',
    '    properties: Record<string, any>;',
    '  };',
    eventEntries,
    '}',
    '',
    '// Base types for type safety',
    `export type TrackerEvent<T extends TrackerEvents> = ${eventNames};`,
    '',
    'export type EventProps<T extends TrackerEvents, E extends TrackerEvent<T>> = T[E]["properties"];',
    '',
    'export interface AnalyticsTracker<T extends TrackerEvents> {',
    '  track<E extends TrackerEvent<T>>(',
    '    event: E,',
    '    properties: EventProps<T, E>',
    '  ): void;',
    '}'
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
    return type.map(t => t).join(" | ");
  }
  return type;
}

function generateEventType(eventKey: string, event: Event): string {
  if (!event.properties) {
    return `export interface ${eventKey}Event {}`;
  }

  const properties = event.properties
    .map((prop: Property) => {
      const type = getPropertyType(prop.type);
      const optional = prop.optional ? " | null | undefined" : "";
      return `  ${prop.name}: ${type}${optional};`;
    })
    .join("\n");

  return `export interface ${eventKey}Event {
${properties}
}`;
}

function generateJavaScriptOutput(trackingConfig: TrackingConfig, events: AnalyticsEvents, includeComments: boolean, outputPath: string) {
  const eventTypes = Object.entries(events.events)
    .map(([eventKey, event]) => generateEventType(eventKey, event))
    .join("\n\n");

  const trackingConfigEvents = Object.entries(events.events).map(([eventKey, event]) => ({
    name: eventKey,
    properties: event.properties?.map((prop: Property) => ({
      name: prop.name,
      type: prop.type,
      optional: prop.optional
    })) || []
  }));

  const config = {
    events: trackingConfigEvents
  };

  const jsOutput = `
// 🔹 Event Configurations
${generateEventConfigs(trackingConfig, events, includeComments)}

${generateTrackingConfig(trackingConfig)}
`;

  fs.writeFileSync(outputPath, jsOutput);
  console.log(`✅ Generated tracking config in ${outputPath}`);
}

function generateTypeScriptOutput(trackingConfig: TrackingConfig, events: AnalyticsEvents, includeComments: boolean, outputPath: string) {
  const analyticsTypes = `
// 🔹 Event Types & Configurations
${generateEventTypes(trackingConfig, events, includeComments)}

${generateEventConfigs(trackingConfig, events, includeComments)}

${generateTypeDefinitions(events)}

${generateTrackingConfig(trackingConfig)}
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
                properties: event.properties?.map((prop) => ({
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
          generateTypeScriptOutput(trackingConfig, events, !genConfig.disableComments, outputPath);
        } else {
          generateJavaScriptOutput(trackingConfig, events, !genConfig.disableComments, outputPath);
        }
      }
    });
}