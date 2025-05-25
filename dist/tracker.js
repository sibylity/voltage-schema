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
                    value = yield value();
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
                // Call the tracking callback with current group properties
                onEventTracked(event.name, {
                    properties: resolvedProperties,
                    meta: event.meta,
                    groups: Object.assign({}, groupProperties)
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
                const groupProps = Object.assign(Object.assign({}, existingProps), properties);
                if (group.properties) {
                    for (const prop of group.properties) {
                        if (prop.defaultValue !== undefined && !(prop.name in groupProps)) {
                            groupProps[prop.name] = prop.defaultValue;
                        }
                    }
                }
                // Resolve group properties
                const resolvedProperties = yield resolveProperties(groupProps);
                // Update the group properties state
                groupProperties[groupName] = resolvedProperties;
                // Call the group update callback
                onGroupUpdated(group.name, resolvedProperties);
            }
            catch (error) {
                onError(error instanceof Error ? error : new Error(String(error)));
            }
        }),
        getProperties: () => (Object.assign({}, groupProperties))
    };
}
exports.createAnalyticsTracker = createAnalyticsTracker;
