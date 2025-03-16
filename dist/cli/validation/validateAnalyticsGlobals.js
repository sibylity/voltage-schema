"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultGlobals = void 0;
exports.validateGlobals = validateGlobals;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const utils_1 = require("./utils");
const validateGlobalsSchema = (0, utils_1.createValidator)(path_1.default.resolve(__dirname, "../../schemas/analytics.globals.schema.json"));
// Default empty globals when file is not provided
exports.defaultGlobals = {
    dimensions: [],
    properties: []
};
function validateGlobalDimensions(dimensions) {
    const errors = [];
    dimensions.forEach((dimension) => {
        if (!dimension.name) {
            errors.push("A dimension is missing a name.");
            return;
        }
        if (!dimension.identifiers || dimension.identifiers.length === 0) {
            errors.push(`Dimension "${dimension.name}" has no identifiers.`);
            return;
        }
        dimension.identifiers.forEach((identifier, index) => {
            if (!identifier.property) {
                errors.push(`Identifier #${index + 1} in dimension "${dimension.name}" is missing a "property" field.`);
            }
            // Ensure only one evaluation field is set
            const evaluationFields = ["contains", "equals", "not", "in", "notIn", "startsWith", "endsWith", "lt", "lte", "gt", "gte"];
            const activeFields = evaluationFields.filter((field) => field in identifier);
            if (activeFields.length === 0) {
                errors.push(`Identifier for property "${identifier.property}" in dimension "${dimension.name}" is missing an evaluation field.`);
            }
            else if (activeFields.length > 1) {
                errors.push(`Identifier for property "${identifier.property}" in dimension "${dimension.name}" has multiple evaluation fields (${activeFields.join(", ")}). Only one is allowed.`);
            }
        });
    });
    return errors.length > 0 ? { isValid: false, errors } : { isValid: true };
}
function validateGlobalProperties(properties) {
    const errors = [];
    properties.forEach((prop) => {
        if (!prop.name || !prop.type) {
            errors.push(`Global property "${prop.name || "[Unnamed]"}" is missing required fields (name, type).`);
        }
    });
    return errors.length > 0 ? { isValid: false, errors } : { isValid: true };
}
function validateGlobals(globalsPath) {
    var _a;
    const context = { filePath: globalsPath };
    (0, utils_1.logValidationStart)(context);
    // If globals file doesn't exist, use defaults
    if (!fs_1.default.existsSync(globalsPath)) {
        console.log(`ℹ️ No globals file found at ${globalsPath}, using default empty values.`);
        return { isValid: true, data: exports.defaultGlobals };
    }
    // Parse globals file
    const parseResult = (0, utils_1.parseJsonFile)(globalsPath);
    if (!parseResult.isValid || !parseResult.data) {
        if (parseResult.errors) {
            (0, utils_1.logValidationErrors)(parseResult.errors);
        }
        return { isValid: false, data: exports.defaultGlobals };
    }
    const globals = parseResult.data;
    // Validate globals schema
    if (!validateGlobalsSchema(globals)) {
        const errors = ((_a = validateGlobalsSchema.errors) === null || _a === void 0 ? void 0 : _a.map(error => `Globals schema validation failed: ${error.message} at ${error.instancePath}`)) || ["Unknown schema validation error"];
        (0, utils_1.logValidationErrors)(errors);
        return { isValid: false, data: globals, errors };
    }
    console.log(`✅ Validating global properties for ${globalsPath}...`);
    const propertiesResult = validateGlobalProperties(globals.properties);
    console.log(`✅ Validating global dimensions for ${globalsPath}...`);
    const dimensionsResult = validateGlobalDimensions(globals.dimensions);
    const errors = [];
    if (!propertiesResult.isValid && propertiesResult.errors) {
        errors.push(...propertiesResult.errors);
    }
    if (!dimensionsResult.isValid && dimensionsResult.errors) {
        errors.push(...dimensionsResult.errors);
    }
    if (errors.length > 0) {
        (0, utils_1.logValidationErrors)(errors);
        return { isValid: false, data: globals, errors };
    }
    (0, utils_1.logValidationSuccess)(context);
    return { isValid: true, data: globals };
}
