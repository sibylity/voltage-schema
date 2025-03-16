"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEvents = validateEvents;
const path_1 = __importDefault(require("path"));
const utils_1 = require("./utils");
const validateEventsSchema = (0, utils_1.createValidator)(path_1.default.resolve(__dirname, "../../schemas/analytics.events.schema.json"));
function validateEventProperties(event, eventKey) {
    const errors = [];
    if (event.properties) {
        event.properties.forEach((prop) => {
            if (!prop.name || !prop.type) {
                errors.push(`Property in event "${eventKey}" is missing required fields (name, type).`);
            }
        });
    }
    return errors.length > 0 ? { isValid: false, errors } : { isValid: true };
}
function validateEventDimensions(event, eventKey, validDimensions, globalsExist) {
    const errors = [];
    if (event.dimensions && event.dimensions.length > 0) {
        if (!globalsExist) {
            console.warn(`⚠️ Event "${eventKey}" specifies dimensions but no globals file exists.`);
        }
        event.dimensions.forEach((dim) => {
            if (!validDimensions.has(dim)) {
                errors.push(`Invalid dimension "${dim}" in event "${eventKey}". It is not listed in globals.dimensions.`);
            }
        });
    }
    return errors.length > 0 ? { isValid: false, errors } : { isValid: true };
}
function validateEvents(eventsPath, validDimensions, globalsExist) {
    var _a;
    const context = { filePath: eventsPath };
    (0, utils_1.logValidationStart)(context);
    // Check if events file exists
    const existsResult = (0, utils_1.validateFileExists)(eventsPath);
    if (!existsResult.isValid) {
        if (existsResult.errors) {
            (0, utils_1.logValidationErrors)(existsResult.errors);
        }
        return existsResult;
    }
    // Parse events file
    const parseResult = (0, utils_1.parseJsonFile)(eventsPath);
    if (!parseResult.isValid || !parseResult.data) {
        if (parseResult.errors) {
            (0, utils_1.logValidationErrors)(parseResult.errors);
        }
        return { isValid: false, errors: parseResult.errors };
    }
    const events = parseResult.data;
    // Validate events schema
    if (!validateEventsSchema(events)) {
        const errors = ((_a = validateEventsSchema.errors) === null || _a === void 0 ? void 0 : _a.map(error => `Events schema validation failed: ${error.message} at ${error.instancePath}`)) || ["Unknown schema validation error"];
        (0, utils_1.logValidationErrors)(errors);
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
        (0, utils_1.logValidationErrors)(errors);
        return { isValid: false, errors };
    }
    (0, utils_1.logValidationSuccess)(context);
    return { isValid: true };
}
