"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllDimensions = void 0;
const analyticsConfigHelper_1 = require("./analyticsConfigHelper");
function initializeDimensionMaps(globals) {
    const dimensionMap = {};
    const dimensionEventCounts = {};
    globals.dimensions.forEach((dim) => {
        dimensionMap[dim.name] = {
            events: [],
            eventDetails: []
        };
        dimensionEventCounts[dim.name] = {};
    });
    return { dimensionMap, dimensionEventCounts };
}
function createEventOutput(eventKey, event, groups, dimensions, metaRules) {
    const eventProperties = (event.properties || []).map(prop => (Object.assign(Object.assign({}, prop), { source: "event" })));
    let allProperties = [...eventProperties];
    if (groups) {
        const groupProperties = groups.flatMap(group => (group.properties || []).map(prop => (Object.assign(Object.assign({}, prop), { source: "group", groupName: group.name }))));
        // Merge properties, keeping event properties if there's a name conflict
        const propertyMap = new Map();
        groupProperties.forEach(prop => {
            if (!propertyMap.has(prop.name)) {
                propertyMap.set(prop.name, prop);
            }
        });
        eventProperties.forEach(prop => {
            propertyMap.set(prop.name, prop);
        });
        allProperties = Array.from(propertyMap.values());
    }
    // Initialize meta with defaultValues from meta rules
    const meta = {};
    if (metaRules) {
        metaRules.forEach(rule => {
            if (rule.defaultValue !== undefined) {
                meta[rule.name] = rule.defaultValue;
            }
        });
    }
    // Merge with any explicit meta values from the event
    if (event.meta) {
        Object.assign(meta, event.meta);
    }
    const output = {
        key: eventKey,
        name: event.name,
        description: event.description,
        properties: allProperties,
        passthrough: event.passthrough,
        meta: Object.keys(meta).length > 0 ? meta : undefined
    };
    return output;
}
function processEvent(eventKey, event, dimensionMap, dimensionEventCounts, globals) {
    // If event has no dimensions field, auto-apply to all dimensions
    if (!event.dimensions) {
        Object.keys(dimensionMap).forEach((dim) => {
            // Track event count for this dimension
            dimensionEventCounts[dim][eventKey] = (dimensionEventCounts[dim][eventKey] || 0) + 1;
            const count = dimensionEventCounts[dim][eventKey];
            // Add event to dimension map with count if needed
            const displayName = count > 1 ? `${eventKey} (${count})` : eventKey;
            dimensionMap[dim].events.push(displayName);
            dimensionMap[dim].eventDetails.push(createEventOutput(eventKey, event, globals.groups, globals.dimensions, globals.meta));
        });
        return;
    }
    // Handle the new dimensions format with included/excluded arrays
    if (typeof event.dimensions === 'object' && !Array.isArray(event.dimensions)) {
        const dimensions = event.dimensions;
        // Get all available dimensions
        const allDimensions = Object.keys(dimensionMap);
        // Handle included dimensions
        if (dimensions.included && Array.isArray(dimensions.included)) {
            // If included array is empty, add to "Ungrouped" dimension
            if (dimensions.included.length === 0) {
                if (!dimensionMap["Ungrouped"]) {
                    dimensionMap["Ungrouped"] = {
                        events: [],
                        eventDetails: []
                    };
                    dimensionEventCounts["Ungrouped"] = {};
                }
                // Track event count for Ungrouped dimension
                dimensionEventCounts["Ungrouped"][eventKey] = (dimensionEventCounts["Ungrouped"][eventKey] || 0) + 1;
                const count = dimensionEventCounts["Ungrouped"][eventKey];
                // Add event to Ungrouped dimension with count if needed
                const displayName = count > 1 ? `${eventKey} (${count})` : eventKey;
                dimensionMap["Ungrouped"].events.push(displayName);
                dimensionMap["Ungrouped"].eventDetails.push(createEventOutput(eventKey, event, globals.groups, globals.dimensions, globals.meta));
                return;
            }
            // Only include the specified dimensions
            dimensions.included.forEach((dim) => {
                if (!dimensionMap[dim]) {
                    console.warn(`⚠️  Dimension "${dim}" in event "${eventKey}" is not listed in any dimensions.`);
                    return;
                }
                // Track event count for this dimension
                dimensionEventCounts[dim][eventKey] = (dimensionEventCounts[dim][eventKey] || 0) + 1;
                const count = dimensionEventCounts[dim][eventKey];
                // Add event to dimension map with count if needed
                const displayName = count > 1 ? `${eventKey} (${count})` : eventKey;
                dimensionMap[dim].events.push(displayName);
                dimensionMap[dim].eventDetails.push(createEventOutput(eventKey, event, globals.groups, globals.dimensions, globals.meta));
            });
        }
        // Handle excluded dimensions
        else if (dimensions.excluded && Array.isArray(dimensions.excluded)) {
            // Include all dimensions except the excluded ones
            allDimensions.forEach((dim) => {
                if (dimensions.excluded && dimensions.excluded.includes(dim)) {
                    return; // Skip excluded dimensions
                }
                // Track event count for this dimension
                dimensionEventCounts[dim][eventKey] = (dimensionEventCounts[dim][eventKey] || 0) + 1;
                const count = dimensionEventCounts[dim][eventKey];
                // Add event to dimension map with count if needed
                const displayName = count > 1 ? `${eventKey} (${count})` : eventKey;
                dimensionMap[dim].events.push(displayName);
                dimensionMap[dim].eventDetails.push(createEventOutput(eventKey, event, globals.groups, globals.dimensions, globals.meta));
            });
        }
        return;
    }
    // Handle the shorthand for event dimensions (array of dimensions)
    if (Array.isArray(event.dimensions)) {
        event.dimensions.forEach((dim) => {
            if (!dimensionMap[dim]) {
                console.warn(`⚠️  Dimension "${dim}" in event "${eventKey}" is not listed in any dimensions.`);
                return;
            }
            // Track event count for this dimension
            dimensionEventCounts[dim][eventKey] = (dimensionEventCounts[dim][eventKey] || 0) + 1;
            const count = dimensionEventCounts[dim][eventKey];
            // Add event to dimension map with count if needed
            const displayName = count > 1 ? `${eventKey} (${count})` : eventKey;
            dimensionMap[dim].events.push(displayName);
            dimensionMap[dim].eventDetails.push(createEventOutput(eventKey, event, globals.groups, globals.dimensions, globals.meta));
        });
    }
}
function formatDimensionOutput(dimensionMap, globals, includeEventDetails) {
    return Object.entries(dimensionMap).map(([dimension, data]) => {
        // Special handling for "Ungrouped" dimension
        if (dimension === "Ungrouped") {
            return {
                dimension,
                description: "Events that are not assigned to any specific dimension.",
                identifiers: { AND: [], OR: [] },
                events: data.events,
                eventDetails: includeEventDetails ? data.eventDetails : undefined
            };
        }
        // Normal handling for other dimensions
        const dimensionConfig = globals.dimensions.find(d => d.name === dimension);
        if (!dimensionConfig) {
            throw new Error(`Dimension "${dimension}" not found in globals`);
        }
        const output = {
            dimension,
            description: dimensionConfig.description,
            identifiers: dimensionConfig.identifiers || { AND: [], OR: [] },
            events: data.events
        };
        if (includeEventDetails) {
            output.eventDetails = data.eventDetails;
        }
        return output;
    });
}
function getAllDimensions(options = {}) {
    // If dimensions are provided directly, use those
    if (options.dimensions) {
        return options.dimensions;
    }
    // Otherwise, use the updated implementation that deduplicates across configs
    const config = (0, analyticsConfigHelper_1.getAnalyticsConfig)();
    // Collect all dimensions and events from all generation configs
    const allDimensions = new Map();
    const allGroups = [];
    const allEvents = {};
    const allMeta = [];
    // First pass: collect all unique dimensions, groups, events, and meta
    config.generates.forEach(genConfig => {
        const { globals: currentGlobals, events } = (0, analyticsConfigHelper_1.readGenerationConfigFiles)(genConfig);
        // Deduplicate dimensions by name
        currentGlobals.dimensions.forEach(dim => {
            if (!allDimensions.has(dim.name)) {
                allDimensions.set(dim.name, dim);
            }
        });
        // Collect all groups (may have duplicates, but that's OK for processing)
        allGroups.push(...(currentGlobals.groups || []));
        // Collect all events
        Object.assign(allEvents, events.events);
        // Collect meta rules
        if (currentGlobals.meta) {
            allMeta.push(...currentGlobals.meta);
        }
    });
    // Create combined globals with deduplicated dimensions
    const combinedGlobals = {
        dimensions: Array.from(allDimensions.values()),
        groups: allGroups,
        meta: allMeta
    };
    // Initialize dimension maps with the combined, deduplicated dimensions
    const { dimensionMap, dimensionEventCounts } = initializeDimensionMaps(combinedGlobals);
    // Process all events against the combined dimensions
    Object.entries(allEvents).forEach(([eventKey, event]) => {
        processEvent(eventKey, event, dimensionMap, dimensionEventCounts, combinedGlobals);
    });
    // Format and return the final output
    return formatDimensionOutput(dimensionMap, combinedGlobals, options.includeEventDetails || options.verbose || false);
}
exports.getAllDimensions = getAllDimensions;
