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
const schemaPath = path_1.default.resolve(__dirname, "../schemas/analytics.schema.json");
const analyticsPath = path_1.default.resolve(process.cwd(), "analytics.json");
const defaultAnalyticsPath = path_1.default.resolve(__dirname, "../schemas/analytics.default.json");
const schema = JSON.parse(fs_1.default.readFileSync(schemaPath, "utf8"));
const validate = ajv.compile(schema);
// Command to validate the analytics.json file
commander_1.program
    .command("validate")
    .description("Validate the analytics.json file and check event structure")
    .action(() => {
    if (!fs_1.default.existsSync(analyticsPath)) {
        console.error("❌ analytics.json file is missing.");
        process.exit(1);
    }
    const data = JSON.parse(fs_1.default.readFileSync(analyticsPath, "utf8"));
    // ✅ Validate against the JSON Schema
    if (!validate(data)) {
        console.error("❌ Schema validation failed:", validate.errors);
        process.exit(1);
    }
    const validDimensions = new Set(data.validDimensions || []);
    let hasInvalidData = false;
    // ✅ Iterate over the events object instead of an array
    Object.entries(data.events).forEach(([eventKey, event]) => {
        console.log(`🔍 Validating event: ${eventKey}`);
        // ✅ Validate event dimensions exist in validDimensions
        if (event.dimensions) {
            event.dimensions.forEach((dim) => {
                if (!validDimensions.has(dim)) {
                    console.error(`❌ Invalid dimension "${dim}" in event "${eventKey}". It is not listed in validDimensions.`);
                    hasInvalidData = true;
                }
            });
        }
        // ✅ Validate that event properties follow schema
        if (event.properties) {
            event.properties.forEach((prop) => {
                if (!prop.name || !prop.type) {
                    console.error(`❌ Property in event "${eventKey}" is missing required fields (name, type).`);
                    hasInvalidData = true;
                }
            });
        }
    });
    if (hasInvalidData) {
        process.exit(1);
    }
    console.log("✅ analytics.json is valid, and all events have correct structures.");
});
// Command to generate an analytics.json file
commander_1.program
    .command("init")
    .description("Create a default analytics.json file")
    .option("--reset", "Replace the existing analytics.json file")
    .action((options) => {
    if (!fs_1.default.existsSync(defaultAnalyticsPath)) {
        console.error("❌ analytics.default.json file is missing. Please create it.");
        process.exit(1);
    }
    if (fs_1.default.existsSync(analyticsPath) && !options.reset) {
        console.warn("⚠️ analytics.json already exists. Use --reset to overwrite it.");
        process.exit(1);
    }
    // Read default config from analytics.default.json
    const defaultConfig = fs_1.default.readFileSync(defaultAnalyticsPath, "utf8");
    fs_1.default.writeFileSync(analyticsPath, defaultConfig);
    console.log(`✅ analytics.json ${options.reset ? "reset" : "created"} successfully!`);
});
// Command to list all evented grouped by dimension
commander_1.program
    .command("dimensions")
    .description("List all events grouped by dimension")
    .action(() => {
    if (!fs_1.default.existsSync(analyticsPath)) {
        console.error("❌ analytics.json file is missing.");
        process.exit(1);
    }
    const data = JSON.parse(fs_1.default.readFileSync(analyticsPath, "utf8"));
    if (!data.validDimensions || !data.events) {
        console.error("❌ analytics.json is missing required fields.");
        process.exit(1);
    }
    // Initialize map of dimensions to event names
    const dimensionMap = {};
    // Initialize all dimensions as keys
    data.validDimensions.forEach((dim) => {
        dimensionMap[dim] = [];
    });
    // Populate dimensionMap with events
    Object.entries(data.events).forEach(([eventKey, event]) => {
        if (event.dimensions) {
            event.dimensions.forEach((dim) => {
                if (!dimensionMap[dim]) {
                    console.warn(`⚠️  Dimension "${dim}" in event "${eventKey}" is not listed in validDimensions.`);
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
commander_1.program.parse(process.argv);
