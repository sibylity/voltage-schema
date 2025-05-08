"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEvents = validateEvents;
const path_1 = __importDefault(require("path"));
const schemaValidation_1 = require("./schemaValidation");
const fileValidation_1 = require("./fileValidation");
const logging_1 = require("./logging");
const validateEventsSchema = (0, schemaValidation_1.createValidator)(path_1.default.resolve(__dirname, "../../schemas/analytics.events.schema.json"));
function validateEventProperties(event, eventKey) {
    const errors = [];
    if (!event.properties) {
        return { isValid: true, data: { events: {} } };
    }
    const propertyNames = new Set();
    for (const prop of event.properties) {
        if (propertyNames.has(prop.name)) {
            errors.push(`Duplicate property name "${prop.name}" in event "${eventKey}"`);
        }
        else {
            propertyNames.add(prop.name);
        }
    }
    return errors.length > 0 ? { isValid: false, errors } : { isValid: true, data: { events: {} } };
}
function validateEventDimensions(event, eventKey, validDimensions, globalsExist) {
    const errors = [];
    if (!event.dimensions) {
        return { isValid: true, data: { events: {} } };
    }
    if (!globalsExist) {
        errors.push(`Event "${eventKey}" has dimensions but no dimensions file is provided`);
        return { isValid: false, errors };
    }
    const { included, excluded } = event.dimensions;
    if (included && excluded) {
        errors.push(`Event "${eventKey}" cannot have both included and excluded dimensions`);
        return { isValid: false, errors };
    }
    const dimensions = included || excluded || [];
    for (const dim of dimensions) {
        if (!validDimensions.includes(dim)) {
            errors.push(`Invalid dimension "${dim}" in event "${eventKey}"`);
        }
    }
    return errors.length > 0 ? { isValid: false, errors } : { isValid: true, data: { events: {} } };
}
function validateEvents(eventsPath, validDimensions, globalsExist) {
    var _a;
    const context = { filePath: eventsPath };
    (0, logging_1.logValidationStart)(context);
    // Check if events file exists
    const existsResult = (0, fileValidation_1.validateFileExists)(eventsPath);
    if (!existsResult.isValid) {
        if (existsResult.errors) {
            (0, logging_1.logValidationErrors)(existsResult.errors);
        }
        return { isValid: false, errors: existsResult.errors };
    }
    // Parse events file
    const parseResult = (0, fileValidation_1.parseSchemaFile)(eventsPath);
    if (!parseResult.isValid || !parseResult.data) {
        if (parseResult.errors) {
            (0, logging_1.logValidationErrors)(parseResult.errors);
        }
        return { isValid: false, errors: parseResult.errors };
    }
    const events = parseResult.data;
    // Validate events schema
    if (!validateEventsSchema(events)) {
        const errors = ((_a = validateEventsSchema.errors) === null || _a === void 0 ? void 0 : _a.map((error) => `Events schema validation failed: ${error.message || "Unknown error"} at ${error.instancePath}`)) || ["Unknown schema validation error"];
        (0, logging_1.logValidationErrors)(errors);
        return { isValid: false, errors };
    }
    const errors = [];
    // Validate each event
    Object.entries(events.events).forEach(([eventKey, event]) => {
        console.log(`🔍 Validating event: ${eventKey}`);
        const propertiesResult = validateEventProperties(event, eventKey);
        const dimensionsResult = validateEventDimensions(event, eventKey, validDimensions, globalsExist);
        if (!propertiesResult.isValid && propertiesResult.errors) {
            errors.push(...propertiesResult.errors);
        }
        if (!dimensionsResult.isValid && dimensionsResult.errors) {
            errors.push(...dimensionsResult.errors);
        }
    });
    if (errors.length > 0) {
        (0, logging_1.logValidationErrors)(errors);
        return { isValid: false, errors };
    }
    (0, logging_1.logValidationSuccess)(context);
    return { isValid: true, data: events };
}
