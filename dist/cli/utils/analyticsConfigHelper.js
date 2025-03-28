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
    const globalsPath = path_1.default.resolve(process.cwd(), genConfig.globals);
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
    let globals;
    if (fs_1.default.existsSync(globalsPath)) {
        try {
            globals = JSON.parse(fs_1.default.readFileSync(globalsPath, "utf8"));
        }
        catch (error) {
            console.error(`❌ Failed to parse globals file at ${globalsPath}:`, error);
            process.exit(1);
        }
    }
    else {
        console.log(`ℹ️ No globals file found at ${globalsPath}, using default empty values.`);
        globals = {
            groups: [],
            dimensions: []
        };
    }
    return { globals, events };
}
