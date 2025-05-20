"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readGenerationConfigFiles = exports.getAnalyticsConfig = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const fileValidation_1 = require("../validation/fileValidation");
function getAnalyticsConfig() {
    const configPath = path_1.default.resolve(process.cwd(), "voltage.config.json");
    if (!fs_1.default.existsSync(configPath)) {
        throw new Error("voltage.config.json not found. Run 'npm voltage init' to create it.");
    }
    const config = JSON.parse(fs_1.default.readFileSync(configPath, "utf8"));
    return config;
}
exports.getAnalyticsConfig = getAnalyticsConfig;
function readGenerationConfigFiles(genConfig) {
    const eventsPath = path_1.default.resolve(process.cwd(), genConfig.events);
    if (!fs_1.default.existsSync(eventsPath)) {
        console.error(`❌ Events file not found: ${eventsPath}`);
        process.exit(1);
    }
    const eventsResult = (0, fileValidation_1.parseSchemaFile)(eventsPath);
    if (!eventsResult.isValid || !eventsResult.data) {
        console.error(`❌ Failed to parse events file at ${eventsPath}:`, eventsResult.errors);
        process.exit(1);
    }
    // Combine groups and dimensions from all files
    const combinedGlobals = {
        groups: [],
        dimensions: []
    };
    // Process groups if present
    if (genConfig.groups) {
        for (const groupFile of genConfig.groups) {
            const groupPath = path_1.default.resolve(process.cwd(), groupFile);
            if (fs_1.default.existsSync(groupPath)) {
                const groupResult = (0, fileValidation_1.parseSchemaFile)(groupPath);
                if (!groupResult.isValid || !groupResult.data) {
                    console.error(`❌ Failed to parse group file at ${groupPath}:`, groupResult.errors);
                    process.exit(1);
                }
                if (groupResult.data.groups) {
                    combinedGlobals.groups.push(...groupResult.data.groups);
                }
            }
            else {
                console.log(`ℹ️ Group file not found at ${groupPath}, skipping.`);
            }
        }
    }
    // Process dimensions if present
    if (genConfig.dimensions) {
        for (const dimensionFile of genConfig.dimensions) {
            const dimensionPath = path_1.default.resolve(process.cwd(), dimensionFile);
            if (fs_1.default.existsSync(dimensionPath)) {
                const dimensionResult = (0, fileValidation_1.parseSchemaFile)(dimensionPath);
                if (!dimensionResult.isValid || !dimensionResult.data) {
                    console.error(`❌ Failed to parse dimension file at ${dimensionPath}:`, dimensionResult.errors);
                    process.exit(1);
                }
                if (dimensionResult.data.dimensions) {
                    combinedGlobals.dimensions.push(...dimensionResult.data.dimensions);
                }
            }
            else {
                console.log(`ℹ️ Dimension file not found at ${dimensionPath}, skipping.`);
            }
        }
    }
    return { globals: combinedGlobals, events: eventsResult.data };
}
exports.readGenerationConfigFiles = readGenerationConfigFiles;
