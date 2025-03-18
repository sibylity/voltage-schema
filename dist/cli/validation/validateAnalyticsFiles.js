"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAnalyticsFiles = validateAnalyticsFiles;
const path_1 = __importDefault(require("path"));
const validateAnalyticsConfig_1 = require("./validateAnalyticsConfig");
const validateAnalyticsGlobals_1 = require("./validateAnalyticsGlobals");
const validateAnalyticsEvents_1 = require("./validateAnalyticsEvents");
const analyticsConfigHelper_1 = require("../utils/analyticsConfigHelper");
function validateAnalyticsFiles() {
    var _a;
    const config = (0, analyticsConfigHelper_1.getAnalyticsConfig)();
    const configPath = path_1.default.resolve(process.cwd(), "analytics.config.json");
    const configResult = (0, validateAnalyticsConfig_1.validateAnalyticsConfig)(configPath, { filePath: configPath });
    if (!configResult.isValid) {
        return false;
    }
    const globalsPath = path_1.default.resolve(process.cwd(), config.generates[0].globals || "");
    const globalsResult = (0, validateAnalyticsGlobals_1.validateGlobals)(globalsPath);
    if (!globalsResult.isValid) {
        return false;
    }
    const validDimensions = new Set(((_a = globalsResult.data) === null || _a === void 0 ? void 0 : _a.dimensions.map((dim) => dim.name)) || []);
    const eventsPath = path_1.default.resolve(process.cwd(), config.generates[0].events);
    const eventsResult = (0, validateAnalyticsEvents_1.validateEvents)(eventsPath, validDimensions, globalsResult.data !== undefined);
    if (!eventsResult.isValid) {
        return false;
    }
    return true;
}
