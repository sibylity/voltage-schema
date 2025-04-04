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
const validateGlobalsSchema = (0, schemaValidation_1.createValidator)(path_1.default.resolve(__dirname, "../../schemas/analytics.groups.schema.json"));
// Default empty globals when file is not provided
exports.defaultGlobals = {
    groups: [],
    dimensions: []
};
function validateGlobalDimensions(dimensions, groups, events) {
    const errors = [];
    // Create sets of all valid property names from groups and events
    const groupPropertyNames = new Set();
    groups.forEach(group => {
        group.properties.forEach((prop) => {
            groupPropertyNames.add(prop.name);
        });
    });
    const eventPropertyNames = new Set();
    Object.values(events).forEach(event => {
        if (event.properties) {
            event.properties.forEach((prop) => {
                eventPropertyNames.add(prop.name);
            });
        }
    });
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
            // Check if the property exists in either groups or events
            if (!groupPropertyNames.has(identifier.property) && !eventPropertyNames.has(identifier.property)) {
                errors.push(`Dimension "${dimension.name}" identifier at index ${index} references property "${identifier.property}" which does not exist in any group or event`);
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
function validateGroupIdentifiedBy(group) {
    const errors = [];
    if (group.identifiedBy) {
        const propertyExists = group.properties.some(prop => prop.name === group.identifiedBy);
        if (!propertyExists) {
            errors.push(`Group "${group.name}" has identifiedBy "${group.identifiedBy}" but this property does not exist in the group's properties`);
        }
        else {
            // Check if the identifiedBy property is marked as optional
            const identifiedByProperty = group.properties.find(prop => prop.name === group.identifiedBy);
            if (identifiedByProperty === null || identifiedByProperty === void 0 ? void 0 : identifiedByProperty.optional) {
                errors.push(`Group "${group.name}" has identifiedBy "${group.identifiedBy}" but this property is marked as optional. The identifiedBy property is always required.`);
            }
        }
    }
    return errors.length > 0 ? { isValid: false, errors } : { isValid: true };
}
function validateGlobals(globalsPath, eventsPath) {
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
    // Parse events file
    let events = {};
    if (fs_1.default.existsSync(eventsPath)) {
        const eventsParseResult = (0, fileValidation_1.parseJsonFile)(eventsPath);
        if (eventsParseResult.isValid && eventsParseResult.data) {
            events = eventsParseResult.data;
        }
    }
    // Validate globals schema
    if (!validateGlobalsSchema(globals)) {
        const errors = ((_a = validateGlobalsSchema.errors) === null || _a === void 0 ? void 0 : _a.map((error) => `Globals schema validation failed: ${error.message || "Unknown error"} at ${error.instancePath}`)) || ["Unknown schema validation error"];
        (0, logging_1.logValidationErrors)(errors);
        return { isValid: false, data: globals, errors };
    }
    console.log(`✅ Validating global dimensions for ${globalsPath}...`);
    const dimensionsResult = validateGlobalDimensions(globals.dimensions, globals.groups, events);
    const errors = [];
    if (!dimensionsResult.isValid && dimensionsResult.errors) {
        errors.push(...dimensionsResult.errors);
    }
    // Validate each group's identifiedBy field
    globals.groups.forEach(group => {
        console.log(`🔍 Validating group: ${group.name}`);
        const identifiedByResult = validateGroupIdentifiedBy(group);
        if (!identifiedByResult.isValid && identifiedByResult.errors) {
            errors.push(...identifiedByResult.errors);
        }
    });
    if (errors.length > 0) {
        (0, logging_1.logValidationErrors)(errors);
        return { isValid: false, data: globals, errors };
    }
    (0, logging_1.logValidationSuccess)(context);
    return { isValid: true, data: globals };
}
