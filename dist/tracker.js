"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAnalyticsTracker = exports.ValidationError = void 0;
class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
/**
 * Resolves all property values, handling both sync and async values
 */
function resolveProperties(properties) {
    return __awaiter(this, void 0, void 0, function* () {
        const entries = Object.entries(properties);
        const promises = entries.map(([key, value]) => __awaiter(this, void 0, void 0, function* () {
            try {
                // If value is a function, call it
                if (typeof value === 'function') {
                    value = value();
                }
                // If value is a promise, await it
                if (value instanceof Promise) {
                    value = yield value;
                }
                return [key, value];
            }
            catch (error) {
                // Re-throw with context about which property failed
                throw new Error(`Failed to resolve property "${key}": ${error instanceof Error ? error.message : String(error)}`);
            }
        }));
        try {
            const resolvedEntries = yield Promise.all(promises);
            return Object.fromEntries(resolvedEntries);
        }
        catch (error) {
            // Re-throw the error to be caught by the calling function
            throw error;
        }
    });
}
function createAnalyticsTracker(config, options) {
    const { onEventTracked, onGroupUpdated, onError = console.error } = options;
    // Initialize groupProperties with empty objects for each group
    const groupProperties = Object.keys(config.groups || {}).reduce((acc, groupName) => {
        acc[groupName] = {};
        return acc;
    }, {});
    return {
        track: (eventKey, ...args) => __awaiter(this, void 0, void 0, function* () {
            const event = config.events[String(eventKey)];
            if (!event) {
                throw new Error(`Event "${String(eventKey)}" not found in tracking config`);
            }
            try {
                // Start with default values
                const properties = Object.assign({}, args[0]);
                if (event.properties) {
                    for (const prop of event.properties) {
                        if (prop.defaultValue !== undefined && !(prop.name in properties)) {
                            properties[prop.name] = prop.defaultValue;
                        }
                    }
                }
                // Resolve event properties if provided
                const resolvedProperties = yield resolveProperties(properties);
                // Resolve all group properties
                const resolvedGroups = yield Promise.all(Object.entries(groupProperties).map(([groupName, props]) => __awaiter(this, void 0, void 0, function* () {
                    const resolvedProps = yield Promise.all(Object.entries(props).map(([key, propValue]) => __awaiter(this, void 0, void 0, function* () {
                        let value;
                        if (propValue.isFunction) {
                            // Use the stored function if available, otherwise use the unresolved value
                            const funcToResolve = propValue.value || propValue.unresolved;
                            const resolved = yield resolveProperties({ [key]: funcToResolve });
                            value = resolved[key];
                            // Update the last resolved value
                            propValue.lastResolved = value;
                        }
                        else {
                            // For non-function properties, use the value directly
                            value = propValue.value;
                        }
                        return [key, value];
                    })));
                    return [groupName, Object.fromEntries(resolvedProps)];
                })));
                onEventTracked(event.name, {
                    properties: resolvedProperties,
                    meta: (event.meta || {}),
                    groups: Object.fromEntries(resolvedGroups)
                });
            }
            catch (error) {
                onError(error instanceof Error ? error : new Error(String(error)));
            }
        }),
        setProperties: (groupName, properties) => __awaiter(this, void 0, void 0, function* () {
            const group = config.groups[String(groupName)];
            if (!group) {
                throw new Error(`Group "${String(groupName)}" not found in tracking config`);
            }
            try {
                // Start with existing properties and merge in new ones
                const existingProps = groupProperties[groupName] || {};
                const groupProps = Object.assign({}, existingProps);
                // Process each new property
                for (const [key, value] of Object.entries(properties)) {
                    const isFunction = typeof value === 'function';
                    groupProps[key] = {
                        value,
                        isFunction,
                        unresolved: isFunction ? value : undefined
                    };
                }
                // Add default values for any missing properties
                if (group.properties) {
                    for (const prop of group.properties) {
                        if (prop.defaultValue !== undefined && !(prop.name in groupProps)) {
                            groupProps[prop.name] = {
                                value: prop.defaultValue,
                                isFunction: false
                            };
                        }
                    }
                }
                // Write to groupProperties immediately to avoid race conditions
                groupProperties[groupName] = groupProps;
                // Now resolve all properties
                const initialValues = yield Promise.all(Object.entries(groupProps).map(([key, propValue]) => __awaiter(this, void 0, void 0, function* () {
                    let value;
                    if (propValue.isFunction) {
                        const resolved = yield resolveProperties({ [key]: propValue.value });
                        value = resolved[key];
                    }
                    else {
                        value = propValue.value;
                    }
                    return [key, value];
                })));
                // Update the group properties state with resolved values
                for (const [key, value] of initialValues) {
                    groupProps[key].lastResolved = value;
                }
                // Update groupProperties again with resolved values
                groupProperties[groupName] = groupProps;
                // Call the group update callback with resolved values
                const resolvedValues = Object.fromEntries(initialValues);
                onGroupUpdated(group.name, resolvedValues);
            }
            catch (error) {
                onError(error instanceof Error ? error : new Error(String(error)));
            }
        }),
        getProperties: () => {
            // Return only the resolved values
            return Object.fromEntries(Object.entries(groupProperties).map(([groupName, props]) => [
                groupName,
                Object.fromEntries(Object.entries(props).map(([key, propValue]) => {
                    if (propValue.isFunction) {
                        // For function properties, use lastResolved if available
                        return [key, propValue.lastResolved || propValue.value];
                    }
                    // For non-function properties, use the value directly
                    return [key, propValue.value];
                }))
            ]));
        }
    };
}
exports.createAnalyticsTracker = createAnalyticsTracker;
