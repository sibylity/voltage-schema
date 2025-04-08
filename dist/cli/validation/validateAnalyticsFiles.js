"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAnalyticsFiles = validateAnalyticsFiles;
const path_1 = __importDefault(require("path"));
const logging_1 = require("./logging");
const validateAnalyticsConfig_1 = require("./validateAnalyticsConfig");
const validateAnalyticsEvents_1 = require("./validateAnalyticsEvents");
const analyticsConfigHelper_1 = require("../utils/analyticsConfigHelper");
const validateAnalyticsGroups_1 = require("./validateAnalyticsGroups");
function validateAnalyticsFiles() {
    var _a, _b, _c, _d;
    const config = (0, analyticsConfigHelper_1.getAnalyticsConfig)();
    const configPath = path_1.default.resolve(process.cwd(), "analytics.config.json");
    const configResult = (0, validateAnalyticsConfig_1.validateAnalyticsConfig)(configPath, { filePath: configPath });
    if (!configResult.isValid) {
        return false;
    }
    // Process each generation config
    for (const genConfig of config.generates) {
        const eventsPath = path_1.default.resolve(process.cwd(), genConfig.events);
        // Track group names to check for duplicates
        const groupNames = new Set();
        const duplicateGroups = new Set();
        let hasValidGroups = true;
        // First pass: collect all group names and check for duplicates
        for (const groupFile of genConfig.groups) {
            const groupPath = path_1.default.resolve(process.cwd(), groupFile);
            const groupsResult = (0, validateAnalyticsGroups_1.validateGroups)(groupPath, eventsPath);
            if (!groupsResult.isValid) {
                hasValidGroups = false;
                continue;
            }
            // Check for duplicate group names
            (_b = (_a = groupsResult.data) === null || _a === void 0 ? void 0 : _a.groups) === null || _b === void 0 ? void 0 : _b.forEach((group) => {
                if (groupNames.has(group.name)) {
                    duplicateGroups.add(group.name);
                }
                else {
                    groupNames.add(group.name);
                }
            });
        }
        // If we found duplicate groups, log the error
        if (duplicateGroups.size > 0) {
            const errorMessage = `Found duplicate group names across group files: ${Array.from(duplicateGroups).join(', ')}`;
            (0, logging_1.logValidationErrors)([errorMessage]);
            hasValidGroups = false;
        }
        // Combine dimensions from all group files
        const allDimensions = new Set();
        for (const groupFile of genConfig.groups) {
            const groupPath = path_1.default.resolve(process.cwd(), groupFile);
            const groupsResult = (0, validateAnalyticsGroups_1.validateGroups)(groupPath, eventsPath);
            if (!groupsResult.isValid) {
                hasValidGroups = false;
                continue;
            }
            // Add dimensions from this group file to the set
            (_d = (_c = groupsResult.data) === null || _c === void 0 ? void 0 : _c.dimensions) === null || _d === void 0 ? void 0 : _d.forEach((dim) => {
                allDimensions.add(dim.name);
            });
        }
        if (!hasValidGroups) {
            return false;
        }
        const eventsResult = (0, validateAnalyticsEvents_1.validateEvents)(eventsPath, allDimensions, true);
        if (!eventsResult.isValid) {
            return false;
        }
    }
    return true;
}
