"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTrackingConfig = generateTrackingConfig;
exports.registerGenerateCommand = registerGenerateCommand;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const validation_1 = require("../validation");
const analyticsConfigHelper_1 = require("../utils/analyticsConfigHelper");
const fileValidation_1 = require("../validation/fileValidation");
/**
 * Normalizes an event key to be safe for use as a variable name.
 * Converts to CamelCase and removes unsafe characters.
 * Example: "page_view" -> "pageView", "3d-render!" -> "threeDRender"
 */
function normalizeEventKey(key) {
    // Handle numbers at the start
    key = key.replace(/^\d+/, match => {
        const numberWords = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
        return match.split('').map(digit => numberWords[parseInt(digit)]).join('');
    });
    // Split on any non-alphanumeric characters
    const words = key.split(/[^a-zA-Z0-9]+/);
    // Convert to CamelCase
    return words.map((word, index) => {
        if (!word)
            return '';
        return index === 0
            ? word.toLowerCase()
            : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join('');
}
/**
 * Generates event configurations with optional JSDoc comments
 */
function generateEventConfigs(trackingConfig, events, includeComments, eventKeyPropertyName = 'Event Key') {
    return Object.entries(trackingConfig.events)
        .map(([key, event]) => {
        var _a;
        const normalizedKey = normalizeEventKey(key);
        const originalEvent = events.events[key];
        const comment = includeComments && originalEvent.description
            ? `/** ${originalEvent.description} */\n`
            : '';
        // Create a map of property descriptions from the original event
        const propertyDescriptions = new Map(((_a = originalEvent.properties) === null || _a === void 0 ? void 0 : _a.map(prop => [prop.name, prop.description])) || []);
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
function generateTrackingConfig(globals, events, includeComments, eventKeyPropertyName = 'Event Key') {
    const eventEntries = Object.entries(events.events || {})
        .map(([key, event]) => {
        var _a;
        const eventComment = includeComments && event.description && event.description.length > 0 ? `    /** ${event.description} */\n` : '';
        // Create a map of property descriptions from the original event
        const propertyDescriptions = new Map(((_a = event.properties) === null || _a === void 0 ? void 0 : _a.map((prop) => [prop.name, prop.description])) || []);
        return `${eventComment}    ${key}: {
      name: '${event.name}',
      properties: [
        ${includeComments ? `/** The key that is used to track the "${key}" implementation of the "${event.name}" event. */\n        ` : ''}{
          name: '${eventKeyPropertyName}',
          type: 'string',
          defaultValue: '${key}'
        }${event.properties && event.properties.length > 0 ? ',\n        ' + event.properties.map((prop) => {
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
    const groupsConfig = globals.groups.map((group) => {
        var _a;
        const groupComment = includeComments && group.description && group.description.length > 0 ? `    /** ${group.description} */\n` : '';
        const hasProperties = group.properties && group.properties.length > 0 &&
            !group.properties.every((prop) => prop === undefined);
        // Create a map of property descriptions from the original group
        const propertyDescriptions = new Map(((_a = group.properties) === null || _a === void 0 ? void 0 : _a.map((prop) => [prop.name, prop.description])) || []);
        const propertyEntries = hasProperties ? group.properties.map((prop) => {
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
function generateTypeDefinitions(events, globals) {
    const eventTypes = Object.entries(events.events).map(([key, event]) => {
        var _a;
        let properties = ((_a = event.properties) === null || _a === void 0 ? void 0 : _a.length)
            ? `{ ${event.properties.map((prop) => {
                const type = Array.isArray(prop.type) ? prop.type.map((t) => `'${t}'`).join(' | ') : prop.type;
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
        const metaType = '\n      meta?: Record<string, string | number | boolean>;';
        return `    ${key}: {
      name: '${event.name}';
      properties: ${properties};${metaType}
    };`;
    }).join('\n\n');
    const groupTypes = globals.groups.map((group) => {
        var _a;
        let properties = ((_a = group.properties) === null || _a === void 0 ? void 0 : _a.length)
            ? `{ ${group.properties.map((prop) => {
                const type = Array.isArray(prop.type) ? prop.type.map((t) => `'${t}'`).join(' | ') : prop.type;
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
function generateJavaScriptOutput(trackingConfig, events, includeComments, outputPath, eventKeyPropertyName = 'Event Key') {
    const jsOutput = `
// 🔹 Event Configurations
${generateEventConfigs(trackingConfig, events, includeComments, eventKeyPropertyName)}

${generateTrackingConfig({ groups: [], dimensions: [], events: {} }, { groups: [], dimensions: [], events: {} }, includeComments, eventKeyPropertyName)}
`;
    fs_1.default.writeFileSync(outputPath, jsOutput);
    console.log(`✅ Generated tracking config in ${outputPath}`);
}
function generateTypeScriptOutput(trackingConfig, events, includeComments, outputPath, genConfig) {
    const { globals } = (0, analyticsConfigHelper_1.readGenerationConfigFiles)(genConfig);
    if (!globals) {
        throw new Error('Failed to read globals configuration');
    }
    const eventKeyPropertyName = genConfig.eventKeyPropertyName || 'Event Key';
    const analyticsTypes = `// 🔹 Event Types & Configurations

${generateEventConfigs(trackingConfig, events, includeComments, eventKeyPropertyName)}

// 🔹 Generated Types
${generateTypeDefinitions(events, globals)}

${generateTrackingConfig(globals, events, includeComments, eventKeyPropertyName)}`;
    fs_1.default.writeFileSync(outputPath, analyticsTypes.trim() + '\n');
    console.log(`✅ Generated tracking config and TypeScript definitions in ${outputPath}`);
}
function registerGenerateCommand(program) {
    program
        .command("generate")
        .description("Generate TypeScript types & tracking config from your codegen config")
        .action(() => {
        console.log("🔍 Validating voltage.config.json...");
        const config = (0, analyticsConfigHelper_1.getAnalyticsConfig)();
        try {
            if (!(0, validation_1.validateAnalyticsFiles)())
                return;
            // Process each generation config
            config.generates.forEach(genConfig => {
                const outputPath = path_1.default.resolve(process.cwd(), genConfig.output);
                const outputDir = path_1.default.dirname(outputPath);
                const outputExt = path_1.default.extname(outputPath).toLowerCase();
                const { events } = (0, analyticsConfigHelper_1.readGenerationConfigFiles)(genConfig);
                // Combine groups from all group files
                const allGroups = {};
                if (genConfig.groups) {
                    genConfig.groups.forEach(groupFile => {
                        const groupPath = path_1.default.resolve(process.cwd(), groupFile);
                        const groupResult = (0, fileValidation_1.parseSchemaFile)(groupPath);
                        if (!groupResult.isValid || !groupResult.data) {
                            console.error(`❌ Failed to parse group file at ${groupPath}:`, groupResult.errors);
                            process.exit(1);
                        }
                        if (groupResult.data.groups) {
                            Object.assign(allGroups, groupResult.data.groups);
                        }
                    });
                }
                if (!fs_1.default.existsSync(outputDir)) {
                    fs_1.default.mkdirSync(outputDir, { recursive: true });
                }
                console.log(`📁 Generating files in ${outputDir}...`);
                // Generate trackingConfig object without descriptions
                const trackingConfig = {
                    events: Object.fromEntries(Object.entries(events.events).map(([eventKey, event]) => {
                        var _a;
                        return [
                            eventKey,
                            {
                                name: event.name,
                                properties: ((_a = event.properties) === null || _a === void 0 ? void 0 : _a.map((prop) => ({
                                    name: prop.name,
                                    type: prop.type,
                                    optional: prop.optional,
                                    defaultValue: prop.defaultValue
                                }))) || [],
                                passthrough: event.passthrough,
                                meta: event.meta
                            }
                        ];
                    })),
                    groups: Object.fromEntries(Object.entries(allGroups).map(([groupName, group]) => {
                        var _a;
                        return [
                            groupName,
                            {
                                name: group.name,
                                properties: ((_a = group.properties) === null || _a === void 0 ? void 0 : _a.map((prop) => ({
                                    name: prop.name,
                                    type: prop.type,
                                    optional: prop.optional,
                                    defaultValue: prop.defaultValue
                                }))) || [],
                                identifiedBy: group.identifiedBy,
                                passthrough: group.passthrough
                            }
                        ];
                    }))
                };
                // Generate output based on file extension
                if (outputExt === ".ts" || outputExt === ".tsx") {
                    generateTypeScriptOutput(trackingConfig, events, !genConfig.disableComments, outputPath, genConfig);
                }
                else {
                    generateJavaScriptOutput(trackingConfig, events, !genConfig.disableComments, outputPath, genConfig.eventKeyPropertyName);
                }
            });
        }
        catch (error) {
            console.error(error);
            process.exit(1);
        }
    });
}
