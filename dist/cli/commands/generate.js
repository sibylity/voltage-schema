"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerGenerateCommand = registerGenerateCommand;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const validation_1 = require("../validation");
const configPath = path_1.default.resolve(process.cwd(), "analytics.config.json");
function registerGenerateCommand(program) {
    program
        .command("generate")
        .description("Generate tracking configs & TypeScript types from analytics files")
        .option("--no-descriptions", "Exclude description fields from the generated output", true)
        .action(() => {
        console.log("🔍 Running validation before generating...");
        if (!(0, validation_1.validateAnalyticsFiles)())
            return;
        const config = JSON.parse(fs_1.default.readFileSync(configPath, "utf8"));
        const noDescriptions = true; // Default is to ignore descriptions
        // Process each generation config
        for (const genConfig of config.generates) {
            const globalsPath = path_1.default.resolve(process.cwd(), genConfig.globals);
            const eventsPath = path_1.default.resolve(process.cwd(), genConfig.events);
            const outputPath = path_1.default.resolve(process.cwd(), genConfig.output);
            const outputDir = path_1.default.dirname(outputPath);
            const globals = JSON.parse(fs_1.default.readFileSync(globalsPath, "utf8"));
            const events = JSON.parse(fs_1.default.readFileSync(eventsPath, "utf8"));
            if (!fs_1.default.existsSync(outputDir)) {
                fs_1.default.mkdirSync(outputDir, { recursive: true });
            }
            console.log(`📁 Generating TypeScript files in ${outputDir}...`);
            // Generate trackingConfig object
            const trackingConfig = {
                globalProperties: globals.properties.map((prop) => (Object.assign({ name: prop.name, type: prop.type }, (noDescriptions ? {} : { description: prop.description })))),
                events: Object.fromEntries(Object.entries(events.events).map(([eventKey, event]) => {
                    var _a;
                    return [
                        eventKey,
                        {
                            name: event.name,
                            properties: ((_a = event.properties) === null || _a === void 0 ? void 0 : _a.map((prop) => (Object.assign({ name: prop.name, type: prop.type }, (noDescriptions ? {} : { description: prop.description }))))) || []
                        }
                    ];
                }))
            };
            // Generate TypeScript definitions
            const analyticsTypes = `
export type TrackingEvent = ${Object.keys(events.events)
                .map((eventKey) => `"${eventKey}"`)
                .join(" | ")};

export type EventProperties = {
${Object.entries(events.events)
                .map(([eventKey, event]) => {
                var _a;
                const properties = ((_a = event.properties) === null || _a === void 0 ? void 0 : _a.map((prop) => `    "${prop.name}": ${prop.type};`).join("\n")) || "    // No properties";
                return `  "${eventKey}": {\n${properties}\n  };`;
            })
                .join("\n")}
};

export type GlobalProperties = {
${globals.properties
                .map((prop) => `  "${prop.name}": ${prop.type};`)
                .join("\n")}
};

// 🔹 Tracking config object
export const trackingConfig = ${JSON.stringify(trackingConfig, null, 2)} as const;

// 🔹 Enforce type safety on tracking
export interface Tracker {
  track<E extends TrackingEvent>(
    event: E,
    properties: EventProperties[E]
  ): void;
};
`;
            fs_1.default.writeFileSync(outputPath, analyticsTypes);
            console.log(`✅ Generated tracking config and TypeScript definitions in ${outputPath}`);
        }
    });
}
