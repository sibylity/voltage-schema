import fs from "fs";
import path from "path";
import { CLI } from "../cli";
import { type AnalyticsGlobals, type AnalyticsEvents, type GenerationConfig, type AnalyticsSchemaProperty } from "../../types";
import { validateAnalyticsFiles } from "../validation";
import { getAnalyticsConfig } from "../utils/analyticsConfigHelper";
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
function generateTrackingConfig(eventsData: any, groupsData: any[], dimensionsData: any[], metaRules?: any[], disableComments?: boolean, eventKeyPropertyName: string = 'Event Key'): string {
  if (!eventsData || !eventsData.events || typeof eventsData.events !== 'object') {
    throw new Error('Invalid events data structure. Expected an object with an "events" property.');
  }

  // Create a map of meta rules with defaultValues, excluding private rules
  const metaRuleMap = new Map(
    (metaRules || [])
      .filter((rule: any) => !rule.private)
      .map((rule: any) => [rule.name, rule])
  );

  const eventEntries = Object.entries(eventsData.events || {})
    .map(([key, event]: [string, any]) => {
      if (!event || typeof event !== 'object') {
        throw new Error(`Invalid event data for key "${key}". Expected an object.`);
      }

      const eventComment = !disableComments && event.description && event.description.length > 0 ? `    /** ${event.description} */\n` : '';

      // Create a map of property descriptions from the original event
      const propertyDescriptions = new Map(
        (event.properties || []).map((prop: any) => [prop.name, prop.description])
      );

      // Initialize meta with defaultValues from meta rules
      const meta: Record<string, string | number | boolean> = {};
      metaRuleMap.forEach((rule, name) => {
        if (rule.defaultValue !== undefined) {
          meta[name] = rule.defaultValue;
        }
      });

      // Merge with any explicit meta values from the event, excluding private meta rules
      if (event.meta) {
        const publicMeta = { ...event.meta };
        metaRules?.forEach((rule: any) => {
          if (rule.private && rule.name in publicMeta) {
            delete publicMeta[rule.name];
          }
        });
        Object.assign(meta, publicMeta);
      }

      return `${eventComment}    ${key}: {
      name: '${event.name}',
      properties: [
        ${!disableComments ? `/** The key that is used to track the "${key}" implementation of the "${event.name}" event. */\n        ` : ''}{
          name: '${eventKeyPropertyName}',
          type: 'string',
          defaultValue: '${key}'
        }${event.properties && event.properties.length > 0 ? ',\n        ' + event.properties.map((prop: any) => {
          if (!prop || typeof prop !== 'object') {
            throw new Error(`Invalid property data in event "${key}". Expected an object.`);
          }
          const propComment = !disableComments && propertyDescriptions.get(prop.name) ? `/** ${propertyDescriptions.get(prop.name)} */\n        ` : '';
          return `${propComment}{
          name: '${prop.name}',
          type: ${Array.isArray(prop.type) ? JSON.stringify(prop.type) : `'${prop.type}'`}${prop.defaultValue !== undefined ? `,\n          defaultValue: ${JSON.stringify(prop.defaultValue)}` : ''}
        }`;
        }).join(',\n        ') : ''}
      ]${event.passthrough ? ',\n      passthrough: true' : ''}${Object.keys(meta).length > 0 ? `,\n      meta: ${JSON.stringify(meta)}` : ''}
    }`;
    })
    .join(',\n');

  const groupsConfig = (groupsData || []).map((group: any) => {
    if (!group || typeof group !== 'object') {
      throw new Error(`Invalid group data. Expected an object.`);
    }

    const groupComment = !disableComments && group.description && group.description.length > 0 ? `    /** ${group.description} */\n` : '';
    const hasProperties = group.properties && group.properties.length > 0 &&
      !group.properties.every((prop: any) => prop === undefined);

    // Create a map of property descriptions from the original group
    const propertyDescriptions = new Map(
      (group.properties || []).map((prop: any) => [prop.name, prop.description])
    );

    const propertyEntries = hasProperties ? group.properties.map((prop: any) => {
      if (!prop || typeof prop !== 'object') {
        throw new Error(`Invalid property data in group "${group.name}". Expected an object.`);
      }
      const propComment = !disableComments && propertyDescriptions.get(prop.name) ? `        /** ${propertyDescriptions.get(prop.name)} */\n        ` : '';
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
      ]${group.identifiedBy ? `,\n      identifiedBy: '${group.identifiedBy}'` : ''}${group.passthrough ? ',\n      passthrough: true' : ''},
      meta: {}
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
function generateTypes(eventsData: any, groupsData: any[], dimensionsData: any[], metaRules?: any[], disableComments?: boolean, eventKeyPropertyName?: string): string {
  if (!eventsData || !eventsData.events || typeof eventsData.events !== 'object') {
    throw new Error('Invalid events data structure. Expected an object with an "events" property.');
  }

  const eventTypes = Object.entries(eventsData.events).map(([key, event]: [string, any]) => {
    if (!event || typeof event !== 'object') {
      throw new Error(`Invalid event data for key "${key}". Expected an object.`);
    }

    const properties = event.properties?.map((prop: { name: string; type: string | string[] }) => {
      const type = Array.isArray(prop.type)
        ? prop.type.map(t => `'${t}'`).join(' | ')
        : prop.type === 'string' || prop.type === 'number' || prop.type === 'boolean'
          ? prop.type
          : `'${prop.type}'`;
      return `'${prop.name}': ${type} | (() => ${type}) | Promise<${type}> | (() => Promise<${type}>)`;
    }) || [];

    // Add index signature for passthrough events
    if (event.passthrough) {
      properties.push('[key: string]: any');
    }

        // Generate meta type based on meta rules
    let metaType = '';
    if (metaRules && metaRules.length > 0) {
      const metaProperties = metaRules
        .filter((rule: any) => !rule.private) // Exclude private meta rules
        .map((rule: any) => {
          const type = Array.isArray(rule.type)
            ? rule.type.map((t: string) => `'${t}'`).join(' | ')
            : rule.type === 'string' || rule.type === 'number' || rule.type === 'boolean'
              ? rule.type
              : `'${rule.type}'`;

          const isOptional = rule.optional && rule.defaultValue === undefined;
          return `'${rule.name}'${isOptional ? '?' : ''}: ${type}`;
        });

      if (metaProperties.length > 0) {
        metaType = `\n      meta: { ${metaProperties.join('; ')} };`;
      } else {
        metaType = `\n      meta: {};`;
      }
    } else {
      metaType = `\n      meta: {};`;
    }

    return `    ${key}: {
      name: '${event.name}';
      properties: { ${properties.join('; ')} };${metaType}
    };`;
  }).join('\n\n');

  const groupTypes = (groupsData || []).map((group: any) => {
    if (!group || typeof group !== 'object') {
      throw new Error(`Invalid group data. Expected an object.`);
    }

    const properties = group.properties?.map((prop: { name: string; type: string | string[] }) => {
      const type = Array.isArray(prop.type)
        ? prop.type.map(t => `'${t}'`).join(' | ')
        : prop.type === 'string' || prop.type === 'number' || prop.type === 'boolean'
          ? prop.type
          : `'${prop.type}'`;
      return `'${prop.name}': ${type} | (() => ${type}) | Promise<${type}> | (() => Promise<${type}>)`;
    }) || [];

    // Add index signature for passthrough groups
    if (group.passthrough) {
      properties.push('[key: string]: any');
    }

    return `    '${group.name}': {
      name: '${group.name}';
      properties: { ${properties.join('; ')} };${group.identifiedBy ? `\n      identifiedBy: '${group.identifiedBy}';` : ''}
    };`;
  }).join('\n\n');

  const groupNames = groupsData?.map(g => `'${g.name}'`).join(' | ') || 'never';

    // Generate meta interface for TrackerEventBase
  let trackerEventBaseMeta = 'meta: {};';
  if (metaRules && metaRules.length > 0) {
    const metaProperties = metaRules
      .filter((rule: any) => !rule.private) // Exclude private meta rules
      .map((rule: any) => {
        const type = Array.isArray(rule.type)
          ? rule.type.map((t: string) => `'${t}'`).join(' | ')
          : rule.type === 'string' || rule.type === 'number' || rule.type === 'boolean'
            ? rule.type
            : `'${rule.type}'`;

        const isOptional = rule.optional && rule.defaultValue === undefined;
        return `'${rule.name}'${isOptional ? '?' : ''}: ${type}`;
      });

    if (metaProperties.length > 0) {
      trackerEventBaseMeta = `meta: { ${metaProperties.join('; ')} };`;
    } else {
      trackerEventBaseMeta = `meta: {};`;
    }
  }

  return `export interface TrackerEventBase {
  name: string;
  properties?: Array<{
    name: string;
    type: string | string[];
    optional?: boolean;
  }>;
  ${trackerEventBaseMeta}
  passthrough?: boolean;
}

export interface AnalyticsSchema {
  events: {
${eventTypes}
  };
  groups: {
${groupTypes}
  };
}

// Base types for type safety
export type TrackerEvent = ${Object.keys(eventsData.events).map(k => `'${k}'`).join(' | ')};
export type TrackerGroup = ${groupNames};

export type EventProperties<T extends AnalyticsSchema, E extends TrackerEvent> = T['events'][E]['properties'];
export type EventMeta<T extends AnalyticsSchema, E extends TrackerEvent> = T['events'][E]['meta'];
export type GroupProperties<T extends AnalyticsSchema, G extends TrackerGroup> = T['groups'][G]['properties'];

// Helper type to determine if an event has properties
type HasProperties<T extends AnalyticsSchema, E extends TrackerEvent> = EventProperties<T, E> extends Record<string, never> ? false : true;

export interface AnalyticsTracker<T extends AnalyticsSchema> {
  track: <E extends TrackerEvent>(
    eventKey: E,
    ...args: HasProperties<T, E> extends true ? [eventProperties: EventProperties<T, E>] : []
  ) => void;
  setProperties: <G extends TrackerGroup>(
    groupName: G,
    properties: GroupProperties<T, G>
  ) => void;
}`;
}

export function registerGenerateCommand(cli: CLI) {
  cli
    .command("generate", "Generate TypeScript types & tracking config from your codegen config")
    .action((options: Record<string, boolean>) => {
      try {
        console.log("🔍 Running validation before generating types...");
        if (!validateAnalyticsFiles()) {
          process.exit(1);
        }

        const config = getAnalyticsConfig();
        const generationConfigs = config.generates;

        generationConfigs.forEach((generationConfig: GenerationConfig) => {
          const { events, groups, dimensions, meta, output, disableComments, eventKeyPropertyName } = generationConfig;

          // Parse events file
          const eventsResult = parseSchemaFile(events);
          if (!eventsResult.isValid || !eventsResult.data) {
            console.error(`❌ Failed to parse events file: ${events}`);
            if (eventsResult.errors) {
              console.error(eventsResult.errors.join('\n'));
            }
            process.exit(1);
          }
          const eventsData = eventsResult.data;

          // Parse groups files if provided
          const groupsData: any[] = [];
          if (groups) {
            for (const groupFile of groups) {
              const result = parseSchemaFile(groupFile);
              if (!result.isValid || !result.data) {
                console.error(`❌ Failed to parse group file: ${groupFile}`);
                if (result.errors) {
                  console.error(result.errors.join('\n'));
                }
                process.exit(1);
              }
              const data = result.data as { groups?: any[] };
              if (data.groups) {
                groupsData.push(...data.groups);
              }
            }
          }

          // Parse dimensions files if provided
          const dimensionsData = dimensions?.map((dimension: string) => {
            const result = parseSchemaFile(dimension);
            if (!result.isValid || !result.data) {
              console.error(`❌ Failed to parse dimension file: ${dimension}`);
              if (result.errors) {
                console.error(result.errors.join('\n'));
              }
              process.exit(1);
            }
            return result.data;
          }) || [];

          // Parse meta file if provided
          let metaRules;
          if (meta) {
            const metaResult = parseSchemaFile(meta);
            if (!metaResult.isValid || !metaResult.data) {
              console.error(`❌ Failed to parse meta file: ${meta}`);
              if (metaResult.errors) {
                console.error(metaResult.errors.join('\n'));
              }
              process.exit(1);
            }
            metaRules = (metaResult.data as { meta: any[] }).meta;
          }

          // Generate types and tracking config
          const types = generateTypes(eventsData, groupsData, dimensionsData, metaRules, disableComments, eventKeyPropertyName);
          const trackingConfig = generateTrackingConfig(eventsData, groupsData, dimensionsData, metaRules, disableComments, eventKeyPropertyName);

          // Write output file
          const outputPath = path.resolve(process.cwd(), output);
          const outputDir = path.dirname(outputPath);
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }

          const outputContent = output.endsWith(".ts")
            ? `// This file is auto-generated. Do not edit it manually.\n\n${types}\n\n${trackingConfig}`
            : trackingConfig;

          fs.writeFileSync(outputPath, outputContent);
          console.log(`✅ Generated ${output}`);
        });
      } catch (error) {
        console.error("❌ Error generating types:", error);
        process.exit(1);
      }
    });
}
