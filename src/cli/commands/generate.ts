import fs from "fs";
import path from "path";
import { Command } from "commander";
import { type AnalyticsConfig, type AnalyticsGlobals, type AnalyticsEvents } from "../../types";
import { validateAnalyticsFiles } from "../validation";

const configPath = path.resolve(process.cwd(), "analytics.config.json");

interface TrackingConfigProperty {
  name: string;
  type: string | string[];
}

interface TrackingConfigEvent {
  name: string;
  properties: TrackingConfigProperty[];
}

interface TrackingConfig {
  globalProperties: TrackingConfigProperty[];
  events: Record<string, TrackingConfigEvent>;
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
      return `${comment}export const ${normalizedKey}Event = ${JSON.stringify(event, null, 2)} as const;`;
    })
    .join('\n\n');
}

/**
 * Generates the event key mapping object
 */
function generateEventKeyMapping(events: AnalyticsEvents): string {
  return `// 🔹 Event Key Mapping (Original -> Normalized)
export const EVENT_KEYS = {
${Object.keys(events.events)
    .map(key => `  "${key}": "${normalizeEventKey(key)}"`)
    .join(',\n')}
} as const;`;
}

/**
 * Generates the tracking config object
 */
function generateTrackingConfig(trackingConfig: TrackingConfig): string {
  return `// 🔹 Tracking Config Object
export const trackingConfig = {
  globalProperties: ${JSON.stringify(trackingConfig.globalProperties, null, 2)},
  events: {
${Object.keys(trackingConfig.events)
    .map(key => `    "${key}": ${normalizeEventKey(key)}Event`)
    .join(',\n')}
  }
} as const;`;
}

/**
 * Generates TypeScript type definitions for events
 */
function generateEventTypes(trackingConfig: TrackingConfig, events: AnalyticsEvents, includeComments: boolean): string {
  return Object.entries(trackingConfig.events)
    .map(([key, event]) => {
      const normalizedKey = normalizeEventKey(key);
      const properties = event.properties
        .map(prop => `    "${prop.name}": ${prop.type};`)
        .join('\n');
      
      const originalEvent = events.events[key];
      const comment = includeComments && originalEvent.description 
        ? `/** ${originalEvent.description} */\n` 
        : '';
      
      return `
${comment}export type ${normalizedKey}EventProperties = {
${properties || '    // No properties'}
};`;
    })
    .join('\n\n');
}

/**
 * Generates TypeScript interface definitions
 */
function generateTypeDefinitions(events: AnalyticsEvents, globals: AnalyticsGlobals): string {
  const eventUnion = Object.keys(events.events)
    .map(key => `"${key}"`)
    .join(' | ');

  return `// 🔹 Global Types
export type TrackingEvent = ${eventUnion};

export type EventProperties = {
${Object.keys(events.events)
    .map(key => `  "${key}": ${normalizeEventKey(key)}EventProperties;`)
    .join('\n')}
};

export type GlobalProperties = {
${globals.properties
    .map((prop) => `  "${prop.name}": ${prop.type};`)
    .join('\n')}
};

// 🔹 Enforce type safety on tracking
export interface Tracker {
  track<E extends TrackingEvent>(
    event: E,
    properties: EventProperties[E]
  ): void;
};`;
}

function generateJavaScriptOutput(trackingConfig: TrackingConfig, events: AnalyticsEvents, includeComments: boolean, outputPath: string) {
  const jsOutput = `
// 🔹 Event Configurations
${generateEventConfigs(trackingConfig, events, includeComments)}

${generateEventKeyMapping(events)}

${generateTrackingConfig(trackingConfig)}
`;

  fs.writeFileSync(outputPath, jsOutput);
  console.log(`✅ Generated tracking config in ${outputPath}`);
}

function generateTypeScriptOutput(trackingConfig: TrackingConfig, events: AnalyticsEvents, globals: AnalyticsGlobals, includeComments: boolean, outputPath: string) {
  const analyticsTypes = `
// 🔹 Event Types & Configurations
${generateEventTypes(trackingConfig, events, includeComments)}

${generateEventConfigs(trackingConfig, events, includeComments)}

${generateEventKeyMapping(events)}

${generateTypeDefinitions(events, globals)}

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

      const config = JSON.parse(fs.readFileSync(configPath, "utf8")) as AnalyticsConfig;

      // Process each generation config
      for (const genConfig of config.generates) {
        const globalsPath = path.resolve(process.cwd(), genConfig.globals);
        const eventsPath = path.resolve(process.cwd(), genConfig.events);
        const outputPath = path.resolve(process.cwd(), genConfig.output);
        const outputDir = path.dirname(outputPath);
        const outputExt = path.extname(outputPath).toLowerCase();

        const globals = JSON.parse(fs.readFileSync(globalsPath, "utf8")) as AnalyticsGlobals;
        const events = JSON.parse(fs.readFileSync(eventsPath, "utf8")) as AnalyticsEvents;

        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        console.log(`📁 Generating files in ${outputDir}...`);

        // Generate trackingConfig object without descriptions
        const trackingConfig: TrackingConfig = {
          globalProperties: globals.properties.map((prop) => ({
            name: prop.name,
            type: prop.type
          })),
          events: Object.fromEntries(
            Object.entries(events.events).map(([eventKey, event]) => [
              eventKey,
              {
                name: event.name,
                properties: event.properties?.map((prop) => ({
                  name: prop.name,
                  type: prop.type
                })) || []
              }
            ])
          )
        };

        // Generate output based on file extension
        if (outputExt === ".ts" || outputExt === ".tsx") {
          generateTypeScriptOutput(trackingConfig, events, globals, !genConfig.disableComments, outputPath);
        } else {
          generateJavaScriptOutput(trackingConfig, events, !genConfig.disableComments, outputPath);
        }
      }
    });
} 