"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerInitCommand = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function registerInitCommand(cli) {
    cli
        .command("init", "Initialize a new analytics schema")
        .option("--reset", "Reset existing files")
        .option("--single-file", "Create a single merged schema file instead of separate files")
        .action((options) => {
        const defaultAllGroupsPath = path_1.default.resolve(__dirname, "../../schemas/defaults/analytics.all-groups.default.json");
        const defaultAllDimensionsPath = path_1.default.resolve(__dirname, "../../schemas/defaults/analytics.all-dimensions.default.json");
        const defaultEventsPath = path_1.default.resolve(__dirname, "../../schemas/defaults/analytics.events.default.json");
        if (options["single-file"]) {
            // Create a single merged schema file
            const mergedSchemaPath = path_1.default.resolve(process.cwd(), "analytics.schema.yaml");
            if (fs_1.default.existsSync(mergedSchemaPath) && !options.reset) {
                console.log("ℹ️ analytics.schema.yaml already exists. Use --reset to overwrite.");
            }
            else {
                // Read the default files
                const eventsData = JSON.parse(fs_1.default.readFileSync(defaultEventsPath, 'utf8'));
                const groupsData = JSON.parse(fs_1.default.readFileSync(defaultAllGroupsPath, 'utf8'));
                const dimensionsData = JSON.parse(fs_1.default.readFileSync(defaultAllDimensionsPath, 'utf8'));
                // Create merged schema
                const mergedSchema = {
                    events: eventsData.events,
                    groups: groupsData.groups,
                    dimensions: dimensionsData.dimensions
                };
                // Write as YAML (for now, write as JSON - we can add YAML conversion later)
                fs_1.default.writeFileSync(mergedSchemaPath, JSON.stringify(mergedSchema, null, 2));
                console.log("✅ Created analytics.schema.yaml");
            }
            // Create config for single file
            const configPath = path_1.default.resolve(process.cwd(), "voltage.config.js");
            if (fs_1.default.existsSync(configPath) && !options.reset) {
                console.log("ℹ️ voltage.config.js already exists. Use --reset to overwrite.");
            }
            else {
                const config = {
                    generates: [
                        {
                            mergedSchemaFile: "./analytics.schema.yaml",
                            output: "./__analytics_generated__/analytics.ts"
                        }
                    ]
                };
                fs_1.default.writeFileSync(configPath, `module.exports = ${JSON.stringify(config, null, 2)};`);
                console.log("✅ Created voltage.config.js");
            }
        }
        else {
            // Create separate files (existing behavior)
            const files = [
                { src: defaultAllGroupsPath, dest: "analytics.all-groups.yaml", name: "all-groups" },
                { src: defaultAllDimensionsPath, dest: "analytics.all-dimensions.yaml", name: "all-dimensions" },
                { src: defaultEventsPath, dest: "analytics.events.yaml", name: "events" }
            ];
            files.forEach(({ src, dest, name }) => {
                const destPath = path_1.default.resolve(process.cwd(), dest);
                if (fs_1.default.existsSync(destPath) && !options.reset) {
                    console.log(`ℹ️ ${dest} already exists. Use --reset to overwrite.`);
                    return;
                }
                fs_1.default.copyFileSync(src, destPath);
                console.log(`✅ Created ${dest}`);
            });
            // Generate voltage.config.js
            const configPath = path_1.default.resolve(process.cwd(), "voltage.config.js");
            if (fs_1.default.existsSync(configPath) && !options.reset) {
                console.log("ℹ️ voltage.config.js already exists. Use --reset to overwrite.");
                return;
            }
            const config = {
                generates: [
                    {
                        events: "./analytics.events.yaml",
                        groups: ["./analytics.all-groups.yaml"],
                        dimensions: ["./analytics.all-dimensions.yaml"],
                        output: "./__analytics_generated__/analytics.ts"
                    }
                ]
            };
            fs_1.default.writeFileSync(configPath, `module.exports = ${JSON.stringify(config, null, 2)};`);
            console.log("✅ Created voltage.config.js");
        }
    });
}
exports.registerInitCommand = registerInitCommand;
