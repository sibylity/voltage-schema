"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAnalyticsTracker = createAnalyticsTracker;
function createAnalyticsTracker(context, options) {
    const { trackEvent, groupIdentify, onError = console.error } = options;
    let globalProperties = {};
    let groupProperties = {};
    return {
        track: (eventKey, eventProperties) => {
            try {
                const event = context.events[eventKey];
                if (!event) {
                    throw new ValidationError(`Event "${eventKey}" not found`);
                }
                // Validate properties
                validateEventProperties(event, eventProperties);
                // Send the event
                try {
                    trackEvent(event.name, eventProperties, globalProperties, groupProperties);
                }
                catch (error) {
                    onError(new Error(`Failed to send event: ${error instanceof Error ? error.message : String(error)}`));
                }
            }
            catch (error) {
                onError(error instanceof Error ? error : new Error(String(error)));
            }
        },
        group: (groupName, groupIdentifier, properties) => {
            try {
                const group = context.groups[groupName];
                if (!group) {
                    throw new ValidationError(`Group "${String(groupName)}" not found`);
                }
                // Validate properties
                validateGroupProperties(group, properties);
                // Update group properties
                groupProperties[groupName] = properties;
                // Send the group data
                try {
                    groupIdentify(group.name, groupIdentifier, properties);
                }
                catch (error) {
                    onError(new Error(`Failed to group: ${error instanceof Error ? error.message : String(error)}`));
                }
            }
            catch (error) {
                onError(error instanceof Error ? error : new Error(String(error)));
            }
        },
        setProperties: (properties) => {
            try {
                // Update the global properties
                globalProperties = Object.entries(properties).reduce((acc, [key, getter]) => {
                    try {
                        acc[key] = typeof getter === 'function' ? getter() : getter;
                    }
                    catch (error) {
                        onError(new Error(`Failed to get property "${key}": ${error instanceof Error ? error.message : String(error)}`));
                    }
                    return acc;
                }, {});
            }
            catch (error) {
                onError(error instanceof Error ? error : new Error(String(error)));
            }
        },
        getProperties: () => {
            return globalProperties;
        },
        getGroups: () => {
            return groupProperties;
        }
    };
}
// Helper functions for validation
function validateEventProperties(event, properties) {
    if (!event.properties)
        return;
    // Skip unexpected property validation if passthrough is enabled
    if (!event.passthrough) {
        // Check for unexpected properties
        const expectedProperties = new Set(event.properties.map(p => p.name));
        for (const key in properties) {
            if (!expectedProperties.has(key)) {
                throw new ValidationError(`Unexpected property "${key}". Allowed properties: ${[...expectedProperties].join(", ")}`);
            }
        }
    }
    // Check required properties
    for (const prop of event.properties) {
        if (!prop.optional && !(prop.name in properties)) {
            throw new ValidationError(`Required property "${prop.name}" is missing`);
        }
    }
}
function validateGroupProperties(group, properties) {
    if (!group.properties)
        return;
    // Skip unexpected property validation if passthrough is enabled
    if (!group.passthrough) {
        // Check for unexpected properties
        const expectedProperties = new Set(group.properties.map(p => p.name));
        for (const key in properties) {
            if (!expectedProperties.has(key)) {
                throw new ValidationError(`Unexpected property "${key}". Allowed properties: ${[...expectedProperties].join(", ")}`);
            }
        }
    }
    // Check required properties
    for (const prop of group.properties) {
        if (!prop.optional && !(prop.name in properties)) {
            throw new ValidationError(`Required property "${prop.name}" is missing`);
        }
    }
}
class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
    }
}
