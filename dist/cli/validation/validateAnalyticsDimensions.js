"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateDimensions = validateDimensions;
const path_1 = __importDefault(require("path"));
const schemaValidation_1 = require("./schemaValidation");
const fileValidation_1 = require("./fileValidation");
const logging_1 = require("./logging");
const validateDimensionsSchema = (0, schemaValidation_1.createValidator)(path_1.default.resolve(__dirname, "../../schemas/analytics.dimensions.schema.json"));
function validateDimensions(dimensionPath, eventsPath) {
    var _a;
    const result = (0, fileValidation_1.parseJsonFile)(dimensionPath);
    if (!result.isValid) {
        (0, logging_1.logValidationErrors)(result.errors || []);
        return result;
    }
    const isValid = validateDimensionsSchema(result.data);
    if (!isValid) {
        const errors = ((_a = validateDimensionsSchema.errors) === null || _a === void 0 ? void 0 : _a.map((error) => `Invalid dimensions file ${dimensionPath}: ${error.message || "Unknown error"}`)) || [];
        (0, logging_1.logValidationErrors)(errors);
        return { isValid: false, errors };
    }
    return result;
}
