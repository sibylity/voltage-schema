"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAnalyticsConfig = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const schemaValidation_1 = require("./schemaValidation");
const validateConfigSchema = (0, schemaValidation_1.createValidator)(path_1.default.resolve(__dirname, "../../schemas/analytics.config.schema.json"));
const validateGroupsSchema = (0, schemaValidation_1.createValidator)(path_1.default.resolve(__dirname, "../../schemas/analytics.groups.schema.json"));
const validateDimensionsSchema = (0, schemaValidation_1.createValidator)(path_1.default.resolve(__dirname, "../../schemas/analytics.dimensions.schema.json"));
const validateMetaSchema = (0, schemaValidation_1.createValidator)(path_1.default.resolve(__dirname, "../../schemas/analytics.meta.schema.json"));
function validateAnalyticsConfig(configPath, context) {
    if (!fs_1.default.existsSync(configPath)) {
        return { isValid: false, errors: [`Config file not found: ${configPath}`] };
    }
    let config;
    if (configPath.endsWith(".js")) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        config = require(configPath).default || require(configPath);
    }
    else {
        config = JSON.parse(fs_1.default.readFileSync(configPath, "utf8"));
    }
    if (!config || !config.generates || !Array.isArray(config.generates)) {
        return { isValid: false, errors: ["Config must have a 'generates' array."] };
    }
    const errors = [];
    config.generates.forEach((genConfig, index) => {
        if (!genConfig.events) {
            errors.push(`Generation config at index ${index} is missing 'events' property.`);
        }
        if (!genConfig.output) {
            errors.push(`Generation config at index ${index} is missing 'output' property.`);
        }
    });
    return { isValid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
}
exports.validateAnalyticsConfig = validateAnalyticsConfig;
