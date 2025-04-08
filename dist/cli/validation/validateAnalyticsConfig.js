"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAnalyticsConfig = validateAnalyticsConfig;
const path_1 = __importDefault(require("path"));
const schemaValidation_1 = require("./schemaValidation");
const fileValidation_1 = require("./fileValidation");
const logging_1 = require("./logging");
const validateConfigSchema = (0, schemaValidation_1.createValidator)(path_1.default.resolve(__dirname, "../../schemas/analytics.config.schema.json"));
const validateGroupsSchema = (0, schemaValidation_1.createValidator)(path_1.default.resolve(__dirname, "../../schemas/analytics.groups.schema.json"));
const validateDimensionsSchema = (0, schemaValidation_1.createValidator)(path_1.default.resolve(__dirname, "../../schemas/analytics.dimensions.schema.json"));
function validateAnalyticsConfig(configPath, context) {
    var _a, _b, _c;
    (0, logging_1.logValidationStart)(context);
    const result = (0, fileValidation_1.parseJsonFile)(configPath);
    if (!result.isValid || !result.data) {
        (0, logging_1.logValidationErrors)(result.errors || []);
        return result;
    }
    const isValid = validateConfigSchema(result.data);
    if (!isValid) {
        const errors = ((_a = validateConfigSchema.errors) === null || _a === void 0 ? void 0 : _a.map((error) => `Invalid analytics config: ${error.message || "Unknown error"}`)) || [];
        (0, logging_1.logValidationErrors)(errors);
        return { isValid: false, errors };
    }
    // Validate each generation config entry
    for (const genConfig of result.data.generates) {
        // Validate groups if present
        if (genConfig.groups) {
            for (const groupFile of genConfig.groups) {
                const groupResult = (0, fileValidation_1.parseJsonFile)(groupFile);
                if (!groupResult.isValid) {
                    (0, logging_1.logValidationErrors)(groupResult.errors || []);
                    return { isValid: false, errors: groupResult.errors };
                }
                const isGroupValid = validateGroupsSchema(groupResult.data);
                if (!isGroupValid) {
                    const errors = ((_b = validateGroupsSchema.errors) === null || _b === void 0 ? void 0 : _b.map((error) => `Invalid groups file ${groupFile}: ${error.message || "Unknown error"}`)) || [];
                    (0, logging_1.logValidationErrors)(errors);
                    return { isValid: false, errors };
                }
            }
        }
        // Validate dimensions if present
        if (genConfig.dimensions) {
            for (const dimensionFile of genConfig.dimensions) {
                const dimensionResult = (0, fileValidation_1.parseJsonFile)(dimensionFile);
                if (!dimensionResult.isValid) {
                    (0, logging_1.logValidationErrors)(dimensionResult.errors || []);
                    return { isValid: false, errors: dimensionResult.errors };
                }
                const isDimensionValid = validateDimensionsSchema(dimensionResult.data);
                if (!isDimensionValid) {
                    const errors = ((_c = validateDimensionsSchema.errors) === null || _c === void 0 ? void 0 : _c.map((error) => `Invalid dimensions file ${dimensionFile}: ${error.message || "Unknown error"}`)) || [];
                    (0, logging_1.logValidationErrors)(errors);
                    return { isValid: false, errors };
                }
            }
        }
    }
    (0, logging_1.logValidationSuccess)(context);
    return result;
}
