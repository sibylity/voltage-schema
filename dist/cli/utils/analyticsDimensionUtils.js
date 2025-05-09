"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllDimensions = getAllDimensions;
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
function processEvent(eventKey, event, dimensionMap, dimensionEventCounts) {
    // If event has no dimensions field, include it in all dimensions
    if (!event.dimensions) {
        Object.keys(dimensionMap).forEach((dim) => {
            // Track event count for this dimension
            dimensionEventCounts[dim][eventKey] = (dimensionEventCounts[dim][eventKey] || 0) + 1;
            const count = dimensionEventCounts[dim][eventKey];
            // Add event to dimension map with count if needed
            const displayName = count > 1 ? `${eventKey} (${count})` : eventKey;
            dimensionMap[dim].events.push(displayName);
            dimensionMap[dim].eventDetails.push({
                key: eventKey,
                name: event.name,
                description: event.description
            });
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
                dimensionMap["Ungrouped"].eventDetails.push({
                    key: eventKey,
                    name: event.name,
                    description: event.description
                });
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
                dimensionMap[dim].eventDetails.push({
                    key: eventKey,
                    name: event.name,
                    description: event.description
                });
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
                dimensionMap[dim].eventDetails.push({
                    key: eventKey,
                    name: event.name,
                    description: event.description
                });
            });
        }
        return;
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
    // Otherwise, use the original implementation
    const config = (0, analyticsConfigHelper_1.getAnalyticsConfig)();
    let dimensionMap = {};
    let dimensionEventCounts = {};
    let isFirstConfig = true;
    let globals;
    // Process all generation configs
    config.generates.forEach(genConfig => {
        const { globals: currentGlobals, events } = (0, analyticsConfigHelper_1.readGenerationConfigFiles)(genConfig);
        // Store globals from first config
        if (isFirstConfig) {
            globals = currentGlobals;
        }
        // Initialize maps only from the first config that has dimensions
        if (isFirstConfig || Object.keys(dimensionMap).length === 0) {
            ({ dimensionMap, dimensionEventCounts } = initializeDimensionMaps(currentGlobals));
            isFirstConfig = false;
        }
        // Process each event in the current config
        Object.entries(events.events).forEach(([eventKey, event]) => {
            processEvent(eventKey, event, dimensionMap, dimensionEventCounts);
        });
    });
    if (!globals) {
        throw new Error("No globals configuration found");
    }
    return formatDimensionOutput(dimensionMap, globals, options.includeEventDetails || options.verbose || false);
}
