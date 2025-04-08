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
function validateGroupDimensions(dimensions, groups, events) {
    const errors = [];
    // Create a map of group names to their properties
    const groupProperties = new Map();
    groups.forEach(group => {
        const properties = new Set(group.properties.map(prop => prop.name));
        groupProperties.set(group.name, properties);
    });
    // Validate each dimension
    (dimensions || []).forEach(dimension => {
        // Validate AND identifiers if present
        if (dimension.identifiers.AND) {
            dimension.identifiers.AND.forEach(identifier => {
                // Skip validation if no group is specified
                if (!identifier.group) {
                    console.warn(`Dimension "${dimension.name}" has AND identifier with no group specified`);
                    return;
                }
                // Check that the group exists
                if (!groupProperties.has(identifier.group)) {
                    errors.push(`Dimension "${dimension.name}" references non-existent group "${identifier.group}"`);
                    return;
                }
                // Check that the property exists on the specified group
                const properties = groupProperties.get(identifier.group);
                if (!properties.has(identifier.property)) {
                    errors.push(`Dimension "${dimension.name}" references property "${identifier.property}" which does not exist on group "${identifier.group}"`);
                }
            });
        }
        // Validate OR identifiers if present
        if (dimension.identifiers.OR) {
            dimension.identifiers.OR.forEach(identifier => {
                // Skip validation if no group is specified
                if (!identifier.group) {
                    errors.push(`Dimension "${dimension.name}" has OR identifier with no group specified`);
                    return;
                }
                // Check that the group exists
                if (!groupProperties.has(identifier.group)) {
                    errors.push(`Dimension "${dimension.name}" references non-existent group "${identifier.group}"`);
                    return;
                }
                // Check that the property exists on the specified group
                const properties = groupProperties.get(identifier.group);
                if (!properties.has(identifier.property)) {
                    errors.push(`Dimension "${dimension.name}" references property "${identifier.property}" which does not exist on group "${identifier.group}"`);
                }
            });
        }
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
    const parseResult = (0, fileValidation_1.parseJsonFile)(groupsPath);
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
        const eventsParseResult = (0, fileValidation_1.parseJsonFile)(eventsPath);
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
    // Validate each group's identifiedBy field
    groups.groups.forEach(group => {
        console.log(`🔍 Validating group: ${group.name}`);
        const identifiedByResult = validateGroupIdentifiedBy(group);
        if (!identifiedByResult.isValid && identifiedByResult.errors) {
            errors.push(...identifiedByResult.errors);
        }
    });
    if (errors.length > 0) {
        (0, logging_1.logValidationErrors)(errors);
        return { isValid: false, data: groups, errors };
    }
    (0, logging_1.logValidationSuccess)(context);
    return { isValid: true, data: groups };
}
