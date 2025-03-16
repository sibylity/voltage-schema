"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAnalyticsFiles = validateAnalyticsFiles;
const path_1 = __importDefault(require("path"));
const analyticsConfigHelper_1 = require("../utils/analyticsConfigHelper");
const validateAnalyticsGlobals_1 = require("./validateAnalyticsGlobals");
const validateAnalyticsEvents_1 = require("./validateAnalyticsEvents");
const validateAnalyticsConfig_1 = require("./validateAnalyticsConfig");
const utils_1 = require("./utils");
function validateGenerationConfigs(config) {
    var _a;
    const errors = [];
    for (const genConfig of config.generates) {
        const globalsPath = path_1.default.resolve(process.cwd(), genConfig.globals);
        const eventsPath = path_1.default.resolve(process.cwd(), genConfig.events);
        // Validate globals (optional)
        const globalsResult = (0, validateAnalyticsGlobals_1.validateGlobals)(globalsPath);
        if (!globalsResult.isValid) {
            if (globalsResult.errors) {
                errors.push(...globalsResult.errors);
            }
            continue;
        }
        // Get valid dimensions for events validation
        const validDimensions = new Set(((_a = globalsResult.data) === null || _a === void 0 ? void 0 : _a.dimensions.map(dim => dim.name)) || []);
        // Validate events (required)
        const eventsResult = (0, validateAnalyticsEvents_1.validateEvents)(eventsPath, validDimensions, globalsResult.data !== undefined);
        if (!eventsResult.isValid && eventsResult.errors) {
            errors.push(...eventsResult.errors);
        }
    }
    if (errors.length > 0) {
        return { isValid: false, errors };
    }
    return { isValid: true };
}
function validateAnalyticsFiles() {
    try {
        const config = (0, analyticsConfigHelper_1.getAnalyticsConfig)();
        // Validate config file
        const configResult = (0, validateAnalyticsConfig_1.validateAnalyticsConfig)(config);
        if (!configResult.isValid) {
            if (configResult.errors) {
                (0, utils_1.logValidationErrors)(configResult.errors);
            }
            return false;
        }
        // Validate generation configs
        const genResult = validateGenerationConfigs(config);
        if (!genResult.isValid) {
            if (genResult.errors) {
                (0, utils_1.logValidationErrors)(genResult.errors);
            }
            return false;
        }
        console.log("✅ All analytics files are valid, and all events have correct structures.");
        return true;
    }
    catch (error) {
        console.error("❌ Unexpected error during validation:", error instanceof Error ? error.message : String(error));
        return false;
    }
}
