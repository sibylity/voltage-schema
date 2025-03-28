"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultGlobals = void 0;
exports.validateGlobals = validateGlobals;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const schemaValidation_1 = require("./schemaValidation");
const fileValidation_1 = require("./fileValidation");
const logging_1 = require("./logging");
const validateGlobalsSchema = (0, schemaValidation_1.createValidator)(path_1.default.resolve(__dirname, "../../schemas/analytics.globals.schema.json"));
// Default empty globals when file is not provided
exports.defaultGlobals = {
    groups: [],
    properties: [],
    dimensions: []
};
function validateGlobalDimensions(dimensions) {
    const errors = [];
    dimensions.forEach((dimension) => {
        if (!dimension.name) {
            errors.push("Dimension name is required");
            return;
        }
        if (!dimension.description) {
            errors.push(`Dimension "${dimension.name}" description is required`);
            return;
        }
        if (!dimension.identifiers || !Array.isArray(dimension.identifiers)) {
            errors.push(`Dimension "${dimension.name}" identifiers must be an array`);
            return;
        }
        dimension.identifiers.forEach((identifier, index) => {
            if (!identifier.property) {
                errors.push(`Dimension "${dimension.name}" identifier at index ${index} must have a property`);
                return;
            }
            // Validate that only one identifier type is used
            const identifierTypes = [
                identifier.contains,
                identifier.equals,
                identifier.not,
                identifier.in,
                identifier.notIn,
                identifier.startsWith,
                identifier.endsWith,
                identifier.lt,
                identifier.lte,
                identifier.gt,
                identifier.gte
            ].filter(Boolean);
            if (identifierTypes.length > 1) {
                errors.push(`Dimension "${dimension.name}" identifier at index ${index} can only have one type of identifier`);
            }
        });
    });
    return errors.length > 0 ? { isValid: false, errors } : { isValid: true };
}
function validateGlobalProperties(properties) {
    const errors = [];
    properties.forEach((prop) => {
        if (!prop.name) {
            errors.push("Property name is required");
            return;
        }
        if (!prop.description) {
            errors.push(`Property "${prop.name}" description is required`);
            return;
        }
        if (!prop.type) {
            errors.push(`Property "${prop.name}" type is required`);
            return;
        }
        // Validate property type
        const validTypes = ["string", "number", "boolean", "string[]", "number[]", "boolean[]"];
        const type = Array.isArray(prop.type) ? prop.type : [prop.type];
        const invalidTypes = type.filter((t) => !validTypes.includes(t));
        if (invalidTypes.length > 0) {
            errors.push(`Property "${prop.name}" has invalid type(s): ${invalidTypes.join(", ")}. Valid types are: ${validTypes.join(", ")}`);
        }
    });
    return errors.length > 0 ? { isValid: false, errors } : { isValid: true };
}
function validateGlobals(globalsPath) {
    var _a;
    const context = { filePath: globalsPath };
    (0, logging_1.logValidationStart)(context);
    // If globals file doesn't exist, use defaults
    if (!fs_1.default.existsSync(globalsPath)) {
        console.log(`ℹ️ No globals file found at ${globalsPath}, using default empty values.`);
        return { isValid: true, data: exports.defaultGlobals };
    }
    // Parse globals file
    const parseResult = (0, fileValidation_1.parseJsonFile)(globalsPath);
    if (!parseResult.isValid || !parseResult.data) {
        if (parseResult.errors) {
            (0, logging_1.logValidationErrors)(parseResult.errors);
        }
        return { isValid: false, data: exports.defaultGlobals };
    }
    const globals = parseResult.data;
    // Validate globals schema
    if (!validateGlobalsSchema(globals)) {
        const errors = ((_a = validateGlobalsSchema.errors) === null || _a === void 0 ? void 0 : _a.map((error) => `Globals schema validation failed: ${error.message || "Unknown error"} at ${error.instancePath}`)) || ["Unknown schema validation error"];
        (0, logging_1.logValidationErrors)(errors);
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
        (0, logging_1.logValidationErrors)(errors);
        return { isValid: false, data: globals, errors };
    }
    (0, logging_1.logValidationSuccess)(context);
    return { isValid: true, data: globals };
}
