"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultGroups = void 0;
exports.validateGroups = validateGroups;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const schemaValidation_1 = require("./schemaValidation");
const fileValidation_1 = require("./fileValidation");
const logging_1 = require("./logging");
const validateGroupsSchema = (0, schemaValidation_1.createValidator)(path_1.default.resolve(__dirname, "../../schemas/analytics.groups.schema.json"));
// Default empty groups when file is not provided
exports.defaultGroups = {
    groups: [],
    dimensions: []
};
function validateGroupDimensions(dimensions = [], groups = [], events) {
    const errors = [];
    const groupNames = new Set(groups.map(g => g.name));
    dimensions.forEach(dim => {
        if (dim.identifiers) {
            const { AND, OR } = dim.identifiers;
            const identifiers = AND || OR || [];
            identifiers.forEach(identifier => {
                if (!identifier.group || !identifier.property) {
                    errors.push(`Dimension "${dim.name}" has an identifier missing required fields (group, property)`);
                    return;
                }
                if (!groupNames.has(identifier.group)) {
                    errors.push(`Dimension "${dim.name}" references non-existent group "${identifier.group}"`);
                }
                const group = groups.find(g => g.name === identifier.group);
                if (group) {
                    const propertyNames = new Set(group.properties.map(p => p.name));
                    if (!propertyNames.has(identifier.property)) {
                        errors.push(`Dimension "${dim.name}" references non-existent property "${identifier.property}" in group "${identifier.group}"`);
                    }
                }
            });
        }
    });
    return errors.length > 0 ? { isValid: false, errors } : { isValid: true, data: { groups, dimensions } };
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
function validateGroupProperties(group) {
    const errors = [];
    const propertyNames = new Set();
    group.properties.forEach((prop) => {
        if (propertyNames.has(prop.name)) {
            errors.push(`Duplicate property name "${prop.name}" found in group "${group.name}".`);
        }
        else {
            propertyNames.add(prop.name);
        }
    });
    return errors.length > 0 ? { isValid: false, errors } : { isValid: true };
}
function validateGroups(groupsPath, eventsPath) {
    var _a;
    const context = { filePath: groupsPath };
    (0, logging_1.logValidationStart)(context);
    // If groups file doesn't exist, use defaults
    if (!fs_1.default.existsSync(groupsPath)) {
        console.log(`ℹ️ No groups file found at ${groupsPath}, using default empty values.`);
        return { isValid: true, data: exports.defaultGroups };
    }
    // Parse groups file
    const parseResult = (0, fileValidation_1.parseSchemaFile)(groupsPath);
    if (!parseResult.isValid || !parseResult.data) {
        if (parseResult.errors) {
            (0, logging_1.logValidationErrors)(parseResult.errors);
        }
        return { isValid: false, data: exports.defaultGroups };
    }
    const groups = parseResult.data;
    // Parse events file
    let events = {};
    if (fs_1.default.existsSync(eventsPath)) {
        const eventsParseResult = (0, fileValidation_1.parseSchemaFile)(eventsPath);
        if (eventsParseResult.isValid && eventsParseResult.data) {
            events = eventsParseResult.data;
        }
    }
    // Validate groups schema
    if (!validateGroupsSchema(groups)) {
        const errors = ((_a = validateGroupsSchema.errors) === null || _a === void 0 ? void 0 : _a.map((error) => `Groups schema validation failed: ${error.message || "Unknown error"} at ${error.instancePath}`)) || ["Unknown schema validation error"];
        (0, logging_1.logValidationErrors)(errors);
        return { isValid: false, data: groups, errors };
    }
    console.log(`✅ Validating group dimensions for ${groupsPath}...`);
    const dimensionsResult = validateGroupDimensions(groups.dimensions, groups.groups, events);
    const errors = [];
    if (!dimensionsResult.isValid && dimensionsResult.errors) {
        errors.push(...dimensionsResult.errors);
    }
    // Validate each group's identifiedBy field and properties
    groups.groups.forEach(group => {
        console.log(`🔍 Validating group: ${group.name}`);
        const identifiedByResult = validateGroupIdentifiedBy(group);
        if (!identifiedByResult.isValid && identifiedByResult.errors) {
            errors.push(...identifiedByResult.errors);
        }
        const propertiesResult = validateGroupProperties(group);
        if (!propertiesResult.isValid && propertiesResult.errors) {
            errors.push(...propertiesResult.errors);
        }
    });
    if (errors.length > 0) {
        (0, logging_1.logValidationErrors)(errors);
        return { isValid: false, data: groups, errors };
    }
    (0, logging_1.logValidationSuccess)(context);
    return { isValid: true, data: groups };
}
