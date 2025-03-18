"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
            ? `\n/** ${originalEvent.description} */\n`
            : '\n';
        return `${comment}export const ${normalizedKey}Event = ${JSON.stringify(event, null, 2)};`;
    })
        .join('\n\n');
}
/**
 * Generates the tracking config object
 */
function generateTrackingConfig(trackingConfig) {
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
function generateTypeDefinitions(events) {
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
        'export type TrackerEvent<T extends TrackerEvents> = keyof T & string;',
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
function generateEventTypes(trackingConfig, events, includeComments) {
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
function getPropertyType(type) {
    if (Array.isArray(type)) {
        return type.map(t => t).join(" | ");
    }
    return type;
}
function generateEventType(eventKey, event) {
    if (!event.properties) {
        return `export interface ${eventKey}Event {}`;
    }
    const properties = event.properties
        .map((prop) => {
        const type = getPropertyType(prop.type);
        const optional = prop.optional ? " | null | undefined" : "";
        return `  ${prop.name}: ${type}${optional};`;
    })
        .join("\n");
    return `export interface ${eventKey}Event {
${properties}
}`;
}
function generateJavaScriptOutput(trackingConfig, events, includeComments, outputPath) {
    const eventTypes = Object.entries(events.events)
        .map(([eventKey, event]) => generateEventType(eventKey, event))
        .join("\n\n");
    const trackingConfigEvents = Object.entries(events.events).map(([eventKey, event]) => {
        var _a;
        return ({
            name: eventKey,
            properties: ((_a = event.properties) === null || _a === void 0 ? void 0 : _a.map((prop) => ({
                name: prop.name,
                type: prop.type,
                optional: prop.optional
            }))) || []
        });
    });
    const config = {
        events: trackingConfigEvents
    };
    const jsOutput = `
// 🔹 Event Configurations
${generateEventConfigs(trackingConfig, events, includeComments)}

${generateTrackingConfig(trackingConfig)}
`;
    fs_1.default.writeFileSync(outputPath, jsOutput);
    console.log(`✅ Generated tracking config in ${outputPath}`);
}
function generateTypeScriptOutput(trackingConfig, events, includeComments, outputPath) {
    const analyticsTypes = `
// 🔹 Event Types & Configurations
${generateEventTypes(trackingConfig, events, includeComments)}

${generateEventConfigs(trackingConfig, events, includeComments)}

${generateTypeDefinitions(events)}

${generateTrackingConfig(trackingConfig)}
`;
    fs_1.default.writeFileSync(outputPath, analyticsTypes);
    console.log(`✅ Generated tracking config and TypeScript definitions in ${outputPath}`);
}
function registerGenerateCommand(program) {
    program
        .command("generate")
        .description("Generate tracking configs & TypeScript types from analytics files")
        .action(() => {
        console.log("🔍 Running validation before generating...");
        if (!(0, validation_1.validateAnalyticsFiles)())
            return;
        const config = (0, analyticsConfigHelper_1.getAnalyticsConfig)();
        // Process each generation config
        for (const genConfig of config.generates) {
            const outputPath = path_1.default.resolve(process.cwd(), genConfig.output);
            const outputDir = path_1.default.dirname(outputPath);
            const outputExt = path_1.default.extname(outputPath).toLowerCase();
            const { events } = (0, analyticsConfigHelper_1.readGenerationConfigFiles)(genConfig);
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
                                optional: prop.optional
                            }))) || []
                        }
                    ];
                }))
            };
            // Generate output based on file extension
            if (outputExt === ".ts" || outputExt === ".tsx") {
                generateTypeScriptOutput(trackingConfig, events, !genConfig.disableComments, outputPath);
            }
            else {
                generateJavaScriptOutput(trackingConfig, events, !genConfig.disableComments, outputPath);
            }
        }
    });
}
