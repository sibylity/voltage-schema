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
function generateEventConfigs(trackingConfig, events, includeComments) {
    return Object.entries(trackingConfig.events)
        .map(([key, event]) => {
        const normalizedKey = normalizeEventKey(key);
        const originalEvent = events.events[key];
        const comment = includeComments && originalEvent.description
            ? `/** ${originalEvent.description} */\n`
            : '';
        // Check if properties array is empty or contains only undefined
        const hasProperties = event.properties && event.properties.length > 0 &&
            !event.properties.every(prop => prop === undefined);
        return `${comment}export const ${normalizedKey}Event = {
  name: '${event.name}',
  properties: [
    ${hasProperties ? event.properties.map(prop => `{
      name: '${prop.name}',
      type: ${Array.isArray(prop.type) ? JSON.stringify(prop.type) : `'${prop.type}'`}${prop.value !== undefined ? `,\n      value: ${JSON.stringify(prop.value)}` : ''}
    }`).join(',\n    ') : ''}
  ]
};`;
    })
        .join('\n\n');
}
/**
 * Generates the tracking config object
 */
function generateTrackingConfig(globals, events) {
    const eventEntries = Object.entries(events.events || {})
        .map(([key, event]) => {
        // Check if properties array is empty or contains only undefined
        const hasProperties = event.properties && event.properties.length > 0 &&
            !event.properties.every((prop) => prop === undefined);
        return `    ${key}: {
      name: '${event.name}',
      properties: [
        ${hasProperties ? event.properties.map((prop) => `{
          name: '${prop.name}',
          type: ${Array.isArray(prop.type) ? JSON.stringify(prop.type) : `'${prop.type}'`}${prop.value !== undefined ? `,\n          value: ${JSON.stringify(prop.value)}` : ''}
        }`).join(',\n        ') : ''}
      ]
    }`;
    })
        .join(',\n');
    const groupsConfig = globals.groups.map((group) => {
        // Check if properties array is empty or contains only undefined
        const hasProperties = group.properties && group.properties.length > 0 &&
            !group.properties.every((prop) => prop === undefined);
        const propertyEntries = hasProperties ? group.properties.map((prop) => {
            const type = Array.isArray(prop.type) ? JSON.stringify(prop.type) : `'${prop.type}'`;
            return `        {
          name: '${prop.name}',
          type: ${type}${prop.value !== undefined ? `,\n          value: ${JSON.stringify(prop.value)}` : ''}
        }`;
        }).join(',\n') : '';
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
function generateTypeDefinitions(events, globals) {
    const eventTypes = Object.entries(events.events).map(([key, event]) => {
        var _a;
        const properties = ((_a = event.properties) === null || _a === void 0 ? void 0 : _a.length)
            ? `{ ${event.properties.map((prop) => {
                const type = Array.isArray(prop.type) ? prop.type.map((t) => `'${t}'`).join(' | ') : prop.type;
                // Make properties with default values optional
                const isOptional = prop.optional || prop.value !== undefined;
                return `'${prop.name}'${isOptional ? '?' : ''}: ${type} | (() => ${type})`;
            }).join('; ')} }`
            : 'Record<string, never>';
        return `    ${key}: {
      name: '${event.name}';
      properties: ${properties};
    };`;
    }).join('\n\n');
    const groupTypes = globals.groups.map((group) => {
        var _a;
        const properties = ((_a = group.properties) === null || _a === void 0 ? void 0 : _a.length)
            ? `{ ${group.properties.map((prop) => {
                const type = Array.isArray(prop.type) ? prop.type.map((t) => `'${t}'`).join(' | ') : prop.type;
                // Make properties with default values optional
                const isOptional = prop.optional || prop.value !== undefined;
                return `${prop.name}${isOptional ? '?' : ''}: ${type} | (() => ${type})`;
            }).join('; ')} }`
            : 'Record<string, never>';
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
export type TrackerEvent<T extends TrackerEvents> = ${Object.keys(events.events).map(k => `'${k}'`).join(' | ')};
export type TrackerGroup<T extends TrackerEvents> = ${globals.groups.map(g => `'${g.name}'`).join(' | ')};

export type EventProperties<T extends TrackerEvents, E extends TrackerEvent<T>> = T['events'][E]['properties'];
export type GroupProperties<T extends TrackerEvents, G extends TrackerGroup<T>> = T['groups'][G]['properties'];

// Helper type to determine if an event has properties
type HasProperties<T extends TrackerEvents, E extends TrackerEvent<T>> = EventProperties<T, E> extends Record<string, never> ? false : true;

export interface AnalyticsTracker<T extends TrackerEvents> {
  track: <E extends TrackerEvent<T>>(
    eventKey: E,
    ...args: HasProperties<T, E> extends true ? [eventProperties: EventProperties<T, E>] : []
  ) => void;
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
function getPropertyType(type) {
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
function generateJavaScriptOutput(trackingConfig, events, includeComments, outputPath) {
    const jsOutput = `
// 🔹 Event Configurations
${generateEventConfigs(trackingConfig, events, includeComments)}

${generateTrackingConfig({ groups: [], dimensions: [], events: {} }, { groups: [], dimensions: [], events: {} })}
`;
    fs_1.default.writeFileSync(outputPath, jsOutput);
    console.log(`✅ Generated tracking config in ${outputPath}`);
}
function generateTypeScriptOutput(trackingConfig, events, includeComments, outputPath, genConfig) {
    const { globals } = (0, analyticsConfigHelper_1.readGenerationConfigFiles)(genConfig);
    if (!globals) {
        throw new Error('Failed to read globals configuration');
    }
    const analyticsTypes = `// 🔹 Event Types & Configurations

${generateEventConfigs(trackingConfig, events, includeComments)}

// 🔹 Generated Types
${generateTypeDefinitions(events, globals)}

${generateTrackingConfig(globals, events)}`;
    fs_1.default.writeFileSync(outputPath, analyticsTypes.trim() + '\n');
    console.log(`✅ Generated tracking config and TypeScript definitions in ${outputPath}`);
}
function registerGenerateCommand(program) {
    program
        .command("generate")
        .description("Generate tracking configs & TypeScript types from analytics files")
        .action(() => {
        try {
            if (!(0, validation_1.validateAnalyticsFiles)())
                return;
            const config = (0, analyticsConfigHelper_1.getAnalyticsConfig)();
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
                        const groupContent = JSON.parse(fs_1.default.readFileSync(groupPath, 'utf-8'));
                        if (groupContent.groups) {
                            Object.assign(allGroups, groupContent.groups);
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
                                    value: prop.value
                                }))) || []
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
                                    value: prop.value
                                }))) || [],
                                identifiedBy: group.identifiedBy
                            }
                        ];
                    }))
                };
                // Generate output based on file extension
                if (outputExt === ".ts" || outputExt === ".tsx") {
                    generateTypeScriptOutput(trackingConfig, events, !genConfig.disableComments, outputPath, genConfig);
                }
                else {
                    generateJavaScriptOutput(trackingConfig, events, !genConfig.disableComments, outputPath);
                }
            });
        }
        catch (error) {
            console.error(error);
            process.exit(1);
        }
    });
}
