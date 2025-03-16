"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEvents = validateEvents;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const ajv_1 = __importDefault(require("ajv"));
const ajv = new ajv_1.default();
// Load events schema
const eventsSchemaPath = path_1.default.resolve(__dirname, "../../schemas/analytics.events.schema.json");
const eventsSchema = JSON.parse(fs_1.default.readFileSync(eventsSchemaPath, "utf8"));
const validateEventsSchema = ajv.compile(eventsSchema);
function validateEventProperties(event, eventKey) {
    let isValid = true;
    if (event.properties) {
        event.properties.forEach((prop) => {
            if (!prop.name || !prop.type) {
                console.error(`❌ Property in event "${eventKey}" is missing required fields (name, type).`);
                isValid = false;
            }
        });
    }
    return isValid;
}
function validateEventDimensions(event, eventKey, validDimensions, globalsExist) {
    let isValid = true;
    if (event.dimensions && event.dimensions.length > 0) {
        if (!globalsExist) {
            console.warn(`⚠️ Event "${eventKey}" specifies dimensions but no globals file exists.`);
        }
        event.dimensions.forEach((dim) => {
            if (!validDimensions.has(dim)) {
                console.error(`❌ Invalid dimension "${dim}" in event "${eventKey}". It is not listed in globals.dimensions.`);
                isValid = false;
            }
        });
    }
    return isValid;
}
function validateEvents(eventsPath, validDimensions, globalsExist) {
    if (!fs_1.default.existsSync(eventsPath)) {
        console.error(`❌ Events file not found: ${eventsPath}`);
        return false;
    }
    let events;
    try {
        events = JSON.parse(fs_1.default.readFileSync(eventsPath, "utf8"));
    }
    catch (error) {
        console.error(`❌ Failed to parse events file at ${eventsPath}:`, error);
        return false;
    }
    // Validate events schema
    if (!validateEventsSchema(events)) {
        console.error(`❌ Events schema validation failed for ${eventsPath}:`, validateEventsSchema.errors);
        return false;
    }
    let isValid = true;
    // Validate each event
    Object.entries(events.events).forEach(([eventKey, event]) => {
        console.log(`🔍 Validating event: ${eventKey}`);
        const propertiesValid = validateEventProperties(event, eventKey);
        const dimensionsValid = validateEventDimensions(event, eventKey, validDimensions, globalsExist);
        if (!propertiesValid || !dimensionsValid) {
            isValid = false;
        }
    });
    return isValid;
}
