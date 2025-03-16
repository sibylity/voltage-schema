"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const ajv_1 = __importDefault(require("ajv"));
const ajv = new ajv_1.default();
// Load schemas
const configSchemaPath = path_1.default.resolve(__dirname, "../schemas/analytics.config.schema.json");
const globalsSchemaPath = path_1.default.resolve(__dirname, "../schemas/analytics.globals.schema.json");
const eventsSchemaPath = path_1.default.resolve(__dirname, "../schemas/analytics.events.schema.json");
const configSchema = JSON.parse(fs_1.default.readFileSync(configSchemaPath, "utf8"));
const globalsSchema = JSON.parse(fs_1.default.readFileSync(globalsSchemaPath, "utf8"));
const eventsSchema = JSON.parse(fs_1.default.readFileSync(eventsSchemaPath, "utf8"));
const validateConfig = ajv.compile(configSchema);
const validateGlobals = ajv.compile(globalsSchema);
const validateEvents = ajv.compile(eventsSchema);
// Default paths
const configPath = path_1.default.resolve(process.cwd(), "analytics.config.json");
const defaultConfigPath = path_1.default.resolve(__dirname, "../schemas/analytics.default.config.json");
const defaultGlobalsPath = path_1.default.resolve(__dirname, "../schemas/analytics.default.globals.json");
const defaultEventsPath = path_1.default.resolve(__dirname, "../schemas/analytics.default.events.json");
function validateAnalyticsSchema() {
    if (!fs_1.default.existsSync(configPath)) {
        console.error("❌ analytics.config.json file is missing.");
        process.exit(1);
    }
    const config = JSON.parse(fs_1.default.readFileSync(configPath, "utf8"));
    // Validate config schema
    if (!validateConfig(config)) {
        console.error("❌ Config schema validation failed:", validateConfig.errors);
        process.exit(1);
    }
    let hasInvalidData = false;
    // Process each generation config
    for (const genConfig of config.generates) {
        const globalsPath = path_1.default.resolve(process.cwd(), genConfig.globals);
        const eventsPath = path_1.default.resolve(process.cwd(), genConfig.events);
        if (!fs_1.default.existsSync(globalsPath)) {
            console.error(`❌ Globals file not found: ${genConfig.globals}`);
            process.exit(1);
        }
        if (!fs_1.default.existsSync(eventsPath)) {
            console.error(`❌ Events file not found: ${genConfig.events}`);
            process.exit(1);
        }
        const globals = JSON.parse(fs_1.default.readFileSync(globalsPath, "utf8"));
        const events = JSON.parse(fs_1.default.readFileSync(eventsPath, "utf8"));
        // Validate globals schema
        if (!validateGlobals(globals)) {
            console.error(`❌ Globals schema validation failed for ${genConfig.globals}:`, validateGlobals.errors);
            hasInvalidData = true;
            continue;
        }
        // Validate events schema
        if (!validateEvents(events)) {
            console.error(`❌ Events schema validation failed for ${genConfig.events}:`, validateEvents.errors);
            hasInvalidData = true;
            continue;
        }
        const validDimensions = new Set(globals.dimensions.map((dim) => dim.name));
        console.log(`✅ Validating global properties for ${genConfig.globals}...`);
        globals.properties.forEach((prop) => {
            if (!prop.name || !prop.type) {
                console.error(`❌ Global property "${prop.name || "[Unnamed]"}" is missing required fields (name, type).`);
                hasInvalidData = true;
            }
        });
        console.log(`✅ Validating global dimensions for ${genConfig.globals}...`);
        globals.dimensions.forEach((dimension) => {
            if (!dimension.name) {
                console.error("❌ A dimension is missing a name.");
                hasInvalidData = true;
                return false;
            }
            if (!dimension.identifiers || dimension.identifiers.length === 0) {
                console.error(`❌ Dimension "${dimension.name}" has no identifiers.`);
                hasInvalidData = true;
                return false;
            }
            dimension.identifiers.forEach((identifier, index) => {
                if (!identifier.property) {
                    console.error(`❌ Identifier #${index + 1} in dimension "${dimension.name}" is missing a "property" field.`);
                    hasInvalidData = true;
                }
                // Ensure only one evaluation field is set
                const evaluationFields = ["contains", "equals", "not", "in", "notIn", "startsWith", "endsWith", "lt", "lte", "gt", "gte"];
                const activeFields = evaluationFields.filter((field) => field in identifier);
                if (activeFields.length === 0) {
                    console.error(`❌ Identifier for property "${identifier.property}" in dimension "${dimension.name}" is missing an evaluation field.`);
                    hasInvalidData = true;
                }
                else if (activeFields.length > 1) {
                    console.error(`❌ Identifier for property "${identifier.property}" in dimension "${dimension.name}" has multiple evaluation fields (${activeFields.join(", ")}). Only one is allowed.`);
                    hasInvalidData = true;
                }
            });
        });
        // Validate events
        Object.entries(events.events).forEach(([eventKey, event]) => {
            console.log(`🔍 Validating event: ${eventKey}`);
            // Validate event dimensions
            if (event.dimensions) {
                event.dimensions.forEach((dim) => {
                    if (!validDimensions.has(dim)) {
                        console.error(`❌ Invalid dimension "${dim}" in event "${eventKey}". It is not listed in globals.dimensions.`);
                        hasInvalidData = true;
                    }
                });
            }
            // Validate event properties
            if (event.properties) {
                event.properties.forEach((prop) => {
                    if (!prop.name || !prop.type) {
                        console.error(`❌ Property in event "${eventKey}" is missing required fields (name, type).`);
                        hasInvalidData = true;
                    }
                });
            }
        });
    }
    if (hasInvalidData) {
        process.exit(1);
        return false;
    }
    console.log("✅ All analytics files are valid, and all events have correct structures.");
    return true;
}
// Command to validate the analytics files
commander_1.program
    .command("validate")
    .description("Validate the analytics configuration files and check event structure")
    .action(() => {
    validateAnalyticsSchema();
});
// Command to generate default analytics files
commander_1.program
    .command("init")
    .description("Create default analytics configuration files")
    .option("--reset", "Replace existing analytics files")
    .action((options) => {
    const files = [
        { src: defaultConfigPath, dest: configPath, name: "config" },
        { src: defaultGlobalsPath, dest: "analytics.globals.json", name: "globals" },
        { src: defaultEventsPath, dest: "analytics.events.json", name: "events" }
    ];
    for (const file of files) {
        if (!fs_1.default.existsSync(file.src)) {
            console.error(`❌ ${file.name} default file is missing. Please create it.`);
            process.exit(1);
        }
        const destPath = path_1.default.resolve(process.cwd(), file.dest);
        if (fs_1.default.existsSync(destPath) && !options.reset) {
            console.warn(`⚠️ ${file.dest} already exists. Use --reset to overwrite it.`);
            continue;
        }
        const defaultContent = fs_1.default.readFileSync(file.src, "utf8");
        fs_1.default.writeFileSync(destPath, defaultContent);
        console.log(`✅ ${file.dest} ${options.reset ? "reset" : "created"} successfully!`);
    }
});
// Command to list all events grouped by dimension
commander_1.program
    .command("dimensions")
    .description("List all events grouped by dimension")
    .action(() => {
    if (!fs_1.default.existsSync(configPath)) {
        console.error("❌ analytics.config.json file is missing.");
        process.exit(1);
    }
    const config = JSON.parse(fs_1.default.readFileSync(configPath, "utf8"));
    // Process first generation config for dimensions command
    const genConfig = config.generates[0];
    const globalsPath = path_1.default.resolve(process.cwd(), genConfig.globals);
    const eventsPath = path_1.default.resolve(process.cwd(), genConfig.events);
    if (!fs_1.default.existsSync(globalsPath) || !fs_1.default.existsSync(eventsPath)) {
        console.error("❌ Required analytics files are missing.");
        process.exit(1);
    }
    const globals = JSON.parse(fs_1.default.readFileSync(globalsPath, "utf8"));
    const events = JSON.parse(fs_1.default.readFileSync(eventsPath, "utf8"));
    // Initialize map of dimensions to event names
    const dimensionMap = {};
    // Initialize all dimensions as keys
    globals.dimensions.forEach((dim) => {
        dimensionMap[dim.name] = [];
    });
    // Populate dimensionMap with events
    Object.entries(events.events).forEach(([eventKey, event]) => {
        if (event.dimensions) {
            event.dimensions.forEach((dim) => {
                if (!dimensionMap[dim]) {
                    console.warn(`⚠️  Dimension "${dim}" in event "${eventKey}" is not listed in globals.dimensions.`);
                    return;
                }
                dimensionMap[dim].push(eventKey);
            });
        }
    });
    // Convert to array format
    const dimensionList = Object.entries(dimensionMap).map(([dimension, events]) => ({
        dimension,
        events,
    }));
    console.log(JSON.stringify(dimensionList, null, 2));
});
commander_1.program
    .command("generate")
    .description("Generate tracking configs & TypeScript types from analytics files")
    .option("--no-descriptions", "Exclude description fields from the generated output", true)
    .action(() => {
    console.log("🔍 Running validation before generating...");
    if (!validateAnalyticsSchema())
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
commander_1.program.parse(process.argv);
