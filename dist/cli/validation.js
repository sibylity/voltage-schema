"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAnalyticsFiles = validateAnalyticsFiles;
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
function validateAnalyticsFiles() {
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
