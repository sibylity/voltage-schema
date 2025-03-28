"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAnalyticsTracker = createAnalyticsTracker;
function resolvePropertyValue(value) {
    if (typeof value === 'function') {
        return value();
    }
    return value;
}
function resolveProperties(properties) {
    const resolved = {};
    for (const [key, value] of Object.entries(properties)) {
        resolved[key] = resolvePropertyValue(value);
    }
    return resolved;
}
function createAnalyticsTracker(context, options) {
    const { onEventTracked, onGroupUpdate, onError = console.error } = options;
    const groupProperties = {};
    return {
        track: (eventKey, eventProperties) => {
            try {
                const event = context.events[eventKey];
                if (!event) {
                    throw new ValidationError(`Event "${String(eventKey)}" not found`);
                }
                // Validate properties
                validateEventProperties(event, eventProperties);
                // Send the event
                try {
                    const eventName = event.name;
                    const resolvedEventProperties = resolveProperties(eventProperties);
                    const resolvedGroupProperties = Object.fromEntries(Object.entries(groupProperties).map(([key, props]) => [
                        key,
                        resolveProperties(props)
                    ]));
                    onEventTracked(eventName, resolvedEventProperties, resolvedGroupProperties);
                }
                catch (error) {
                    onError(new Error(`Failed to send event: ${error instanceof Error ? error.message : String(error)}`));
                }
            }
            catch (error) {
                onError(error instanceof Error ? error : new Error(String(error)));
            }
        },
        setProperties: (groupName, properties) => {
            try {
                const group = context.groups[groupName];
                if (!group) {
                    throw new ValidationError(`Group "${String(groupName)}" not found`);
                }
                // Validate properties
                validateGroupProperties(group, properties);
                // Update group properties
                groupProperties[groupName] = Object.assign(Object.assign({}, groupProperties[groupName]), properties);
                // Send the group data
                try {
                    const groupNameStr = group.name;
                    const resolvedProperties = resolveProperties(properties);
                    onGroupUpdate(groupNameStr, resolvedProperties);
                }
                catch (error) {
                    onError(new Error(`Failed to update group: ${error instanceof Error ? error.message : String(error)}`));
                }
            }
            catch (error) {
                onError(error instanceof Error ? error : new Error(String(error)));
            }
        },
        getProperties: () => groupProperties
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
