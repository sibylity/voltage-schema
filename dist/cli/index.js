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
function validateAnalyticsSchema() {
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
    let hasInvalidData = false;
    const validDimensions = new Set(data.globals.dimensions.map((dim) => dim.name));
    console.log("✅ Validating global properties...");
    data.globals.properties.forEach((prop) => {
        if (!prop.name || !prop.type) {
            console.error(`❌ Global property "${prop.name || "[Unnamed]"}" is missing required fields (name, type).`);
            hasInvalidData = true;
        }
    });
    console.log("✅ Validating global dimensions...");
    data.globals.dimensions.forEach((dimension) => {
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
    // ✅ Validating events
    Object.entries(data.events).forEach(([eventKey, event]) => {
        console.log(`🔍 Validating event: ${eventKey}`);
        // ✅ Validating event dimensions
        if (event.dimensions) {
            event.dimensions.forEach((dim) => {
                if (!validDimensions.has(dim)) {
                    console.error(`❌ Invalid dimension "${dim}" in event "${eventKey}". It is not listed in globals.dimensions.`);
                    hasInvalidData = true;
                }
            });
        }
        // ✅ Validating event properties
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
        return false;
    }
    console.log("✅ analytics.json is valid, and all events have correct structures.");
    return true;
}
// Command to validate the analytics.json file
commander_1.program
    .command("validate")
    .description("Validate the analytics.json file and check event structure")
    .action(() => {
    validateAnalyticsSchema();
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
// Command to list all events grouped by dimension
commander_1.program
    .command("dimensions")
    .description("List all events grouped by dimension")
    .action(() => {
    if (!fs_1.default.existsSync(analyticsPath)) {
        console.error("❌ analytics.json file is missing.");
        process.exit(1);
    }
    const data = JSON.parse(fs_1.default.readFileSync(analyticsPath, "utf8"));
    if (!data.globals || !data.globals.dimensions || !data.events) {
        console.error("❌ analytics.json is missing required fields.");
        process.exit(1);
    }
    // Initialize map of dimensions to event names
    const dimensionMap = {};
    // Initialize all dimensions as keys
    data.globals.dimensions.forEach((dim) => {
        dimensionMap[dim.name] = [];
    });
    // Populate dimensionMap with events
    Object.entries(data.events).forEach(([eventKey, event]) => {
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
    .description("Generate a trackingConfig object & TypeScript types from analytics.json")
    .option("--no-descriptions", "Exclude description fields from the generated output", true)
    .action(() => {
    console.log("🔍 Running validation before generating...");
    if (!validateAnalyticsSchema())
        return;
    const data = JSON.parse(fs_1.default.readFileSync(analyticsPath, "utf8"));
    if (!data.generatedDir) {
        console.error("❌ Missing `generatedDir` field in analytics.json. Specify a directory for generated output.");
        process.exit(1);
    }
    const outputDir = path_1.default.resolve(process.cwd(), data.generatedDir);
    if (!fs_1.default.existsSync(outputDir)) {
        fs_1.default.mkdirSync(outputDir, { recursive: true });
    }
    console.log(`📁 Generating TypeScript files in ${outputDir}...`);
    const noDescriptions = true; // Default is to ignore descriptions
    // 🔹 Generate trackingConfig object
    const trackingConfig = {
        globalProperties: data.globals.properties.map((prop) => (Object.assign({ name: prop.name, type: prop.type }, (noDescriptions ? {} : { description: prop.description })))),
        events: Object.fromEntries(Object.entries(data.events).map(([eventKey, event]) => {
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
    // 🔹 Generate TypeScript definitions
    const analyticsTypes = `
export type TrackingEvent = ${Object.keys(data.events)
        .map((eventKey) => `"${eventKey}"`)
        .join(" | ")};

export type EventProperties = {
${Object.entries(data.events)
        .map(([eventKey, event]) => {
        var _a;
        const properties = ((_a = event.properties) === null || _a === void 0 ? void 0 : _a.map((prop) => `    "${prop.name}": ${prop.type};`).join("\n")) || "    // No properties";
        return `  "${eventKey}": {\n${properties}\n  };`;
    })
        .join("\n")}
};

export type GlobalProperties = {
${data.globals.properties
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
    fs_1.default.writeFileSync(path_1.default.join(outputDir, "trackingConfig.ts"), analyticsTypes);
    console.log("✅ Generated trackingConfig and TypeScript definitions successfully!");
});
commander_1.program.parse(process.argv);
