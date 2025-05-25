"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEvents = void 0;
const path_1 = __importDefault(require("path"));
const schemaValidation_1 = require("./schemaValidation");
const fileValidation_1 = require("./fileValidation");
const logging_1 = require("./logging");
const eventsSchemaValidator = (0, schemaValidation_1.createValidator)(path_1.default.resolve(__dirname, "../../schemas/analytics.events.schema.json"));
function validateEventProperties(event, eventKey) {
    const errors = [];
    const propertyNames = new Set();
    if (event.properties) {
        for (const prop of event.properties) {
            if (propertyNames.has(prop.name)) {
                errors.push(`Duplicate property name "${prop.name}" in event "${eventKey}"`);
            }
            propertyNames.add(prop.name);
        }
    }
    return {
        isValid: errors.length === 0,
        errors,
        data: errors.length === 0 ? { events: {} } : undefined
    };
}
function validateEventMeta(event, eventKey, metaRules) {
    const errors = [];
    const metaRuleMap = new Map(metaRules.map(rule => [rule.name, rule]));
    if (event.meta) {
        // Check for unknown meta fields
        for (const [key, value] of Object.entries(event.meta)) {
            const rule = metaRuleMap.get(key);
            if (!rule) {
                errors.push(`Unknown meta field "${key}" in event "${eventKey}"`);
                continue;
            }
            // Validate value type
            if (Array.isArray(rule.type)) {
                if (!rule.type.includes(value)) {
                    errors.push(`Invalid value "${value}" for meta field "${key}" in event "${eventKey}". Expected one of: ${rule.type.join(", ")}`);
                }
            }
            else if (rule.type === "string" && typeof value !== "string") {
                errors.push(`Invalid value type for meta field "${key}" in event "${eventKey}". Expected string, got ${typeof value}`);
            }
            else if (rule.type === "number" && typeof value !== "number") {
                errors.push(`Invalid value type for meta field "${key}" in event "${eventKey}". Expected number, got ${typeof value}`);
            }
            else if (rule.type === "boolean" && typeof value !== "boolean") {
                errors.push(`Invalid value type for meta field "${key}" in event "${eventKey}". Expected boolean, got ${typeof value}`);
            }
        }
        // Check for missing required meta fields
        for (const rule of metaRules) {
            if (!rule.optional && !rule.defaultValue && !(rule.name in event.meta)) {
                errors.push(`Missing required meta field "${rule.name}" in event "${eventKey}"`);
            }
        }
    }
    else {
        // Check if any required meta fields are missing
        for (const rule of metaRules) {
            if (!rule.optional) {
                errors.push(`Missing required meta field "${rule.name}" in event "${eventKey}"`);
            }
        }
    }
    return {
        isValid: errors.length === 0,
        errors,
        data: errors.length === 0 ? { events: {} } : undefined
    };
}
function validateEventDimensions(event, dimensions) {
    const errors = [];
    const dimensionNames = new Set(dimensions);
    if (event.dimensions) {
        // Handle array format (shorthand for included)
        if (Array.isArray(event.dimensions)) {
            for (const dimension of event.dimensions) {
                if (!dimensionNames.has(dimension)) {
                    errors.push(`Dimension "${dimension}" does not exist`);
                }
            }
        }
        // Handle object format
        else {
            const { included, excluded } = event.dimensions;
            if (included && excluded) {
                errors.push('Event cannot have both included and excluded dimensions');
            }
            if (included) {
                for (const dimension of included) {
                    if (!dimensionNames.has(dimension)) {
                        errors.push(`Dimension "${dimension}" does not exist`);
                    }
                }
            }
            if (excluded) {
                for (const dimension of excluded) {
                    if (!dimensionNames.has(dimension)) {
                        errors.push(`Dimension "${dimension}" does not exist`);
                    }
                }
            }
        }
    }
    return {
        isValid: errors.length === 0,
        errors,
        data: errors.length === 0 ? { events: {} } : undefined
    };
}
function validateEvents(eventsPath, dimensionNames, globalsExist, metaRules) {
    var _a;
    console.log(`🔍 Validating ${eventsPath}...`);
    if (!eventsPath) {
        console.error("❌ No events file provided");
        return { isValid: false, errors: ["No events file provided"] };
    }
    const eventsResult = (0, fileValidation_1.parseSchemaFile)(eventsPath);
    if (!eventsResult.isValid || !eventsResult.data) {
        console.error(`❌ Failed to parse events file:`, eventsResult.errors);
        return eventsResult;
    }
    const events = eventsResult.data;
    const errors = [];
    // Validate events schema
    const isValid = eventsSchemaValidator(events);
    if (!isValid) {
        const validationErrors = ((_a = eventsSchemaValidator.errors) === null || _a === void 0 ? void 0 : _a.map((e) => e.message || `Validation error at ${e.instancePath}`).filter((msg) => msg !== undefined)) || [];
        (0, logging_1.logValidationErrors)(validationErrors);
        return { isValid: false, errors: validationErrors };
    }
    // Validate each event
    Object.entries(events.events).forEach(([eventKey, event]) => {
        console.log(`🔍 Validating event: ${eventKey}`);
        const propertiesResult = validateEventProperties(event, eventKey);
        const dimensionsResult = validateEventDimensions(event, dimensionNames);
        const metaResult = metaRules ? validateEventMeta(event, eventKey, metaRules) : { isValid: true };
        if (!propertiesResult.isValid && propertiesResult.errors) {
            errors.push(...propertiesResult.errors);
        }
        if (!dimensionsResult.isValid && dimensionsResult.errors) {
            errors.push(...dimensionsResult.errors);
        }
        if (!metaResult.isValid && metaResult.errors) {
            errors.push(...metaResult.errors);
        }
    });
    if (errors.length > 0) {
        console.error("❌ Validation errors found:", errors);
        return { isValid: false, errors };
    }
    console.log(`✅ ${eventsPath} is valid.`);
    return { isValid: true, data: events };
}
exports.validateEvents = validateEvents;
