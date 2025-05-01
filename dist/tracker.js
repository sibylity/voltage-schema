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
    Object.entries(properties).forEach(([key, value]) => {
        resolved[key] = resolvePropertyValue(value);
    });
    return resolved;
}
function createAnalyticsTracker(context, options) {
    const { onEventTracked, onGroupUpdated, onError = console.error } = options;
    const groupProperties = {};
    return {
        track: (eventKey, ...args) => {
            try {
                const event = context.events[eventKey];
                if (!event) {
                    throw new ValidationError(`Event "${String(eventKey)}" not found`);
                }
                const eventProperties = args[0];
                // Validate properties
                validateEventProperties(event, eventProperties || {});
                // Send the event
                try {
                    const eventName = event.name;
                    // Create a new object with default values
                    const propertiesWithDefaults = {};
                    // Add default values first
                    if (event.properties) {
                        event.properties.forEach(prop => {
                            if (prop.defaultValue !== undefined) {
                                propertiesWithDefaults[prop.name] = prop.defaultValue;
                            }
                        });
                    }
                    // Override with provided properties
                    if (eventProperties) {
                        Object.assign(propertiesWithDefaults, eventProperties);
                    }
                    const resolvedEventProperties = resolveProperties(propertiesWithDefaults);
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
                    // Create a new object with default values
                    const propertiesWithDefaults = {};
                    // Add default values first
                    if (group.properties) {
                        group.properties.forEach(prop => {
                            if (prop.defaultValue !== undefined) {
                                propertiesWithDefaults[prop.name] = prop.defaultValue;
                            }
                        });
                    }
                    // Override with provided properties
                    Object.assign(propertiesWithDefaults, properties);
                    const resolvedProperties = resolveProperties(propertiesWithDefaults);
                    onGroupUpdated(groupNameStr, resolvedProperties);
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
    // Check for unexpected properties only if passthrough is not enabled
    if (!event.passthrough) {
        // Check for unexpected properties
        const expectedProperties = new Set(event.properties.map(p => p.name));
        Object.keys(properties).forEach(key => {
            if (!expectedProperties.has(key)) {
                throw new ValidationError(`Unexpected property "${key}". Allowed properties: ${[...expectedProperties].join(", ")}`);
            }
        });
    }
    // Check required properties (those without optional: true and no default value)
    event.properties.forEach(prop => {
        if (!prop.optional && prop.defaultValue === undefined && !(prop.name in properties)) {
            throw new ValidationError(`Required property "${prop.name}" is missing`);
        }
    });
}
function validateGroupProperties(group, properties) {
    if (!group.properties)
        return;
    // Check for unexpected properties only if passthrough is not enabled
    if (!group.passthrough) {
        // Check for unexpected properties
        const expectedProperties = new Set(group.properties.map(p => p.name));
        Object.keys(properties).forEach(key => {
            if (!expectedProperties.has(key)) {
                throw new ValidationError(`Unexpected property "${key}". Allowed properties: ${[...expectedProperties].join(", ")}`);
            }
        });
    }
    // Check required properties (those without optional: true and no default value)
    group.properties.forEach(prop => {
        if (!prop.optional && prop.defaultValue === undefined && !(prop.name in properties)) {
            throw new ValidationError(`Required property "${prop.name}" is missing`);
        }
    });
}
class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
    }
}
