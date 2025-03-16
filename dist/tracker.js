"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAnalyticsTracker = createAnalyticsTracker;
class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
    }
}
function validateEventProperties(event, properties) {
    var _a;
    if (!event) {
        throw new ValidationError(`Event not found`);
    }
    // Get all required properties
    const expectedProperties = new Set((event.properties || []).map(p => p.name));
    // Check for unexpected properties
    for (const key in properties) {
        if (!expectedProperties.has(key)) {
            throw new ValidationError(`Unexpected property "${key}". Allowed properties: ${[...expectedProperties].join(", ")}`);
        }
    }
    // Check property types if defined in event
    (_a = event.properties) === null || _a === void 0 ? void 0 : _a.forEach(prop => {
        const value = properties[prop.name];
        if (value !== undefined) {
            const type = Array.isArray(prop.type) ? prop.type : [prop.type];
            const valueType = Array.isArray(value) ? 'array' : typeof value;
            if (!type.includes(valueType)) {
                throw new ValidationError(`Invalid type for property "${prop.name}". Expected ${type.join(' | ')}, got ${valueType}`);
            }
        }
    });
}
function createAnalyticsTracker(context, options) {
    const { send, onError = console.error } = options;
    return {
        track: (eventKey, eventProperties) => {
            try {
                const event = context.events[eventKey];
                if (!event) {
                    throw new ValidationError(`Event "${eventKey}" not found`);
                }
                // Validate properties
                validateEventProperties(event, eventProperties);
                // Prepare event data
                const eventData = {
                    eventKey,
                    eventName: event.name,
                    eventProperties,
                };
                // Send the event
                try {
                    send(eventData);
                }
                catch (error) {
                    onError(new Error(`Failed to send event: ${error instanceof Error ? error.message : String(error)}`));
                }
            }
            catch (error) {
                onError(error instanceof Error ? error : new Error(String(error)));
            }
        }
    };
}
