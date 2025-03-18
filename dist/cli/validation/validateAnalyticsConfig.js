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
function validateAnalyticsConfig(configPath, context) {
    var _a;
    (0, logging_1.logValidationStart)(context);
    const result = (0, fileValidation_1.parseJsonFile)(configPath);
    if (!result.isValid) {
        (0, logging_1.logValidationErrors)(result.errors || []);
        return result;
    }
    const isValid = validateConfigSchema(result.data);
    if (!isValid) {
        const errors = ((_a = validateConfigSchema.errors) === null || _a === void 0 ? void 0 : _a.map((error) => `Invalid analytics config: ${error.message || "Unknown error"}`)) || [];
        (0, logging_1.logValidationErrors)(errors);
        return { isValid: false, errors };
    }
    (0, logging_1.logValidationSuccess)(context);
    return result;
}
