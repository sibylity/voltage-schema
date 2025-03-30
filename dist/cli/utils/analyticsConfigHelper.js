"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAnalyticsConfig = getAnalyticsConfig;
exports.readGenerationConfigFiles = readGenerationConfigFiles;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function getAnalyticsConfig() {
    const configPath = path_1.default.resolve(process.cwd(), "analytics.config.json");
    if (!fs_1.default.existsSync(configPath)) {
        console.error("❌ analytics.config.json file is missing in project root.");
        process.exit(1);
    }
    try {
        return JSON.parse(fs_1.default.readFileSync(configPath, "utf8"));
    }
    catch (error) {
        console.error("❌ Failed to parse analytics.config.json:", error);
        process.exit(1);
    }
}
function readGenerationConfigFiles(genConfig) {
    const eventsPath = path_1.default.resolve(process.cwd(), genConfig.events);
    if (!fs_1.default.existsSync(eventsPath)) {
        console.error(`❌ Events file not found: ${eventsPath}`);
        process.exit(1);
    }
    let events;
    try {
        events = JSON.parse(fs_1.default.readFileSync(eventsPath, "utf8"));
    }
    catch (error) {
        console.error(`❌ Failed to parse events file at ${eventsPath}:`, error);
        process.exit(1);
    }
    // Combine groups and dimensions from all group files
    const combinedGlobals = {
        groups: [],
        dimensions: []
    };
    for (const groupFile of genConfig.groups) {
        const groupPath = path_1.default.resolve(process.cwd(), groupFile);
        if (fs_1.default.existsSync(groupPath)) {
            try {
                const groupContent = JSON.parse(fs_1.default.readFileSync(groupPath, "utf8"));
                if (groupContent.groups) {
                    combinedGlobals.groups.push(...groupContent.groups);
                }
                if (groupContent.dimensions) {
                    combinedGlobals.dimensions.push(...groupContent.dimensions);
                }
            }
            catch (error) {
                console.error(`❌ Failed to parse group file at ${groupPath}:`, error);
                process.exit(1);
            }
        }
        else {
            console.log(`ℹ️ Group file not found at ${groupPath}, skipping.`);
        }
    }
    return { globals: combinedGlobals, events };
}
