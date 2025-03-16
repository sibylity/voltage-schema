"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAnalyticsFiles = validateAnalyticsFiles;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const analyticsConfigHelper_1 = require("../utils/analyticsConfigHelper");
const validateAnalyticsGlobals_1 = require("./validateAnalyticsGlobals");
const validateAnalyticsEvents_1 = require("./validateAnalyticsEvents");
const validateAnalyticsConfig_1 = require("./validateAnalyticsConfig");
function validateGenerationConfigs(config) {
    let isValid = true;
    for (const genConfig of config.generates) {
        const globalsPath = path_1.default.resolve(process.cwd(), genConfig.globals);
        const eventsPath = path_1.default.resolve(process.cwd(), genConfig.events);
        // Validate globals (optional)
        const { isValid: globalsValid, globals } = (0, validateAnalyticsGlobals_1.validateGlobals)(globalsPath);
        if (!globalsValid) {
            isValid = false;
            continue;
        }
        // Get valid dimensions for events validation
        const validDimensions = new Set(globals.dimensions.map((dim) => dim.name));
        // Validate events (required)
        if (!(0, validateAnalyticsEvents_1.validateEvents)(eventsPath, validDimensions, fs_1.default.existsSync(globalsPath))) {
            isValid = false;
        }
    }
    return isValid;
}
function validateAnalyticsFiles() {
    const config = (0, analyticsConfigHelper_1.getAnalyticsConfig)();
    if (!(0, validateAnalyticsConfig_1.validateAnalyticsConfig)(config)) {
        return false;
    }
    if (!validateGenerationConfigs(config)) {
        return false;
    }
    console.log("✅ All analytics files are valid, and all events have correct structures.");
    return true;
}
