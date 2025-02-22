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
const schemaPath = path_1.default.resolve(__dirname, "./schemas/analytics.schema.json");
const schema = JSON.parse(fs_1.default.readFileSync(schemaPath, "utf8"));
const validate = ajv.compile(schema);
const analyticsPath = path_1.default.resolve(process.cwd(), "analytics.json");
// Utility to read the analytics file
function readAnalyticsFile() {
    if (!fs_1.default.existsSync(analyticsPath)) {
        console.warn("⚠️  analytics.json not found. Run `json-schema-cli init` to create one.");
        return null;
    }
    return JSON.parse(fs_1.default.readFileSync(analyticsPath, "utf8"));
}
// Command to validate the analytics.json file
commander_1.program
    .command("validate")
    .description("Validate the analytics.json file and check dimensions")
    .action(() => {
    const analyticsPath = path_1.default.resolve(process.cwd(), "analytics.json");
    if (!fs_1.default.existsSync(analyticsPath)) {
        console.error("❌ analytics.json file is missing.");
        process.exit(1);
    }
    // Explicitly type the parsed data
    const data = JSON.parse(fs_1.default.readFileSync(analyticsPath, "utf8"));
    if (!validate(data)) {
        console.error("❌ Schema validation failed:", validate.errors);
        process.exit(1);
    }
    // ✅ Validate event dimensions exist in validDimensions
    const validDimensions = new Set(data.validDimensions || []);
    let hasInvalidDimensions = false;
    data.events.forEach((event) => {
        if (event.dimensions) {
            event.dimensions.forEach((dim) => {
                if (!validDimensions.has(dim)) {
                    console.error(`❌ Invalid dimension "${dim}" in event "${event.name}". It is not listed in validDimensions.`);
                    hasInvalidDimensions = true;
                }
            });
        }
    });
    if (hasInvalidDimensions) {
        process.exit(1);
    }
    console.log("✅ analytics.json is valid, and all dimensions are correctly defined.");
});
// Command to generate an analytics.json file
commander_1.program
    .command("init")
    .description("Create a default analytics.json file")
    .option("--reset", "Replace the existing analytics.json file")
    .action((options) => {
    if (fs_1.default.existsSync(analyticsPath) && !options.reset) {
        console.warn("⚠️ analytics.json already exists. Use --reset to overwrite it.");
        process.exit(1);
    }
    const defaultConfig = {
        globalProperties: [
            {
                name: "url",
                description: "The URL of the page when the event was triggered.",
                type: "string",
            },
            {
                name: "userId",
                description: "The ID of the user that triggered the event.",
                type: "number",
            }
        ],
        events: [
            {
                name: "Page View",
                description: "This events is triggered everytime the user views a page.",
                properties: []
            }
        ]
    };
    fs_1.default.writeFileSync(analyticsPath, JSON.stringify(defaultConfig, null, 2));
    console.log(`✅ analytics.json ${options.reset ? "reset" : "created"} successfully!`);
});
commander_1.program.parse(process.argv);
