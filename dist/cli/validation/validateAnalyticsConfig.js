"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAnalyticsConfig = validateAnalyticsConfig;
const path_1 = __importDefault(require("path"));
const utils_1 = require("./utils");
const validateConfigSchema = (0, utils_1.createValidator)(path_1.default.resolve(__dirname, "../../schemas/analytics.config.schema.json"));
function validateAnalyticsConfig(config) {
    var _a;
    const context = { filePath: "analytics.config.json" };
    (0, utils_1.logValidationStart)(context);
    if (!validateConfigSchema(config)) {
        const errors = ((_a = validateConfigSchema.errors) === null || _a === void 0 ? void 0 : _a.map(error => `Config schema validation failed: ${error.message} at ${error.instancePath}`)) || ["Unknown schema validation error"];
        (0, utils_1.logValidationErrors)(errors);
        return { isValid: false, errors };
    }
    const errors = [];
    // Validate each generation config
    config.generates.forEach((genConfig, index) => {
        const configContext = {
            filePath: genConfig.events,
            configIndex: index
        };
        // Validate events file
        if (!genConfig.events) {
            errors.push(`Missing required "events" field in generation config #${index + 1}`);
        }
        else {
            const eventFileResult = (0, utils_1.validateFileExtension)(genConfig.events, [".json"], configContext);
            if (!eventFileResult.isValid && eventFileResult.errors) {
                errors.push(...eventFileResult.errors);
            }
        }
        // Validate globals file if provided
        if (genConfig.globals) {
            configContext.filePath = genConfig.globals;
            const globalsFileResult = (0, utils_1.validateFileExtension)(genConfig.globals, [".json"], configContext);
            if (!globalsFileResult.isValid && globalsFileResult.errors) {
                errors.push(...globalsFileResult.errors);
            }
        }
        // Validate output file
        if (!genConfig.output) {
            errors.push(`Missing required "output" field in generation config #${index + 1}`);
        }
        else {
            configContext.filePath = genConfig.output;
            const outputFileResult = (0, utils_1.validateFileExtension)(genConfig.output, [".js", ".ts", ".tsx"], configContext);
            if (!outputFileResult.isValid && outputFileResult.errors) {
                errors.push(...outputFileResult.errors);
            }
        }
    });
    if (errors.length > 0) {
        (0, utils_1.logValidationErrors)(errors);
        return { isValid: false, errors };
    }
    (0, utils_1.logValidationSuccess)(context);
    return { isValid: true };
}
