"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAnalyticsTracker = exports.ValidationError = void 0;
class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
function resolveProperties(properties) {
    return Object.fromEntries(Object.entries(properties).map(([key, value]) => [
        key,
        typeof value === 'function' ? value() : value
    ]));
}
function validateEventProperties(event, properties) {
    if (!event.properties) {
        return;
    }
    for (const prop of event.properties) {
        if (!prop.optional && !(prop.name in properties) && prop.defaultValue === undefined) {
            throw new ValidationError(`Required property "${prop.name}" is missing`);
        }
        if (prop.name in properties) {
            const value = properties[prop.name];
            const type = Array.isArray(prop.type) ? prop.type : [prop.type];
            if (!type.some(t => {
                if (t === 'string')
                    return typeof value === 'string';
                if (t === 'number')
                    return typeof value === 'number';
                if (t === 'boolean')
                    return typeof value === 'boolean';
                return value === t;
            })) {
                throw new ValidationError(`Property "${prop.name}" has invalid type. Expected ${type.join(' | ')}, got ${typeof value}`);
            }
        }
    }
}
function validateGroupProperties(group, properties) {
    if (!group.properties) {
        return;
    }
    for (const prop of group.properties) {
        if (!prop.optional && !(prop.name in properties) && prop.defaultValue === undefined) {
            throw new ValidationError(`Required property "${prop.name}" is missing`);
        }
        if (prop.name in properties) {
            const value = properties[prop.name];
            const type = Array.isArray(prop.type) ? prop.type : [prop.type];
            if (!type.some(t => {
                if (t === 'string')
                    return typeof value === 'string';
                if (t === 'number')
                    return typeof value === 'number';
                if (t === 'boolean')
                    return typeof value === 'boolean';
                return value === t;
            })) {
                throw new ValidationError(`Property "${prop.name}" has invalid type. Expected ${type.join(' | ')}, got ${typeof value}`);
            }
        }
    }
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
                        event.properties.forEach((prop) => {
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
                    onEventTracked(eventName, {
                        properties: resolvedEventProperties,
                        meta: event.meta,
                        groups: resolvedGroupProperties
                    });
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
                        group.properties.forEach((prop) => {
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
exports.createAnalyticsTracker = createAnalyticsTracker;
