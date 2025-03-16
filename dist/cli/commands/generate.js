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
        return `${comment}export const ${normalizedKey}Event = ${JSON.stringify(event, null, 2)} as const;`;
    })
        .join('\n\n');
}
/**
 * Generates the event key mapping object
 */
function generateEventKeyMapping(events) {
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
function generateTrackingConfig(trackingConfig) {
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
function generateEventTypes(trackingConfig, events, includeComments) {
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
function generateTypeDefinitions(events, globals) {
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
function generateJavaScriptOutput(trackingConfig, events, includeComments, outputPath) {
    const jsOutput = `
// 🔹 Event Configurations
${generateEventConfigs(trackingConfig, events, includeComments)}

${generateEventKeyMapping(events)}

${generateTrackingConfig(trackingConfig)}
`;
    fs_1.default.writeFileSync(outputPath, jsOutput);
    console.log(`✅ Generated tracking config in ${outputPath}`);
}
function generateTypeScriptOutput(trackingConfig, events, globals, includeComments, outputPath) {
    const analyticsTypes = `
// 🔹 Event Types & Configurations
${generateEventTypes(trackingConfig, events, includeComments)}

${generateEventConfigs(trackingConfig, events, includeComments)}

${generateEventKeyMapping(events)}

${generateTypeDefinitions(events, globals)}

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
            const { globals, events } = (0, analyticsConfigHelper_1.readGenerationConfigFiles)(genConfig);
            if (!fs_1.default.existsSync(outputDir)) {
                fs_1.default.mkdirSync(outputDir, { recursive: true });
            }
            console.log(`📁 Generating files in ${outputDir}...`);
            // Generate trackingConfig object without descriptions
            const trackingConfig = {
                globalProperties: globals.properties.map((prop) => ({
                    name: prop.name,
                    type: prop.type
                })),
                events: Object.fromEntries(Object.entries(events.events).map(([eventKey, event]) => {
                    var _a;
                    return [
                        eventKey,
                        {
                            name: event.name,
                            properties: ((_a = event.properties) === null || _a === void 0 ? void 0 : _a.map((prop) => ({
                                name: prop.name,
                                type: prop.type
                            }))) || []
                        }
                    ];
                }))
            };
            // Generate output based on file extension
            if (outputExt === ".ts" || outputExt === ".tsx") {
                generateTypeScriptOutput(trackingConfig, events, globals, !genConfig.disableComments, outputPath);
            }
            else {
                generateJavaScriptOutput(trackingConfig, events, !genConfig.disableComments, outputPath);
            }
        }
    });
}
