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
    if (!event.dimensions)
        return;
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
        dimensionMap[dim].eventDetails.push({
            key: eventKey,
            name: event.name,
            description: event.description
        });
    });
}
function formatDimensionOutput(dimensionMap, globals, includeEventDetails) {
    return Object.entries(dimensionMap).map(([dimension, data]) => {
        const dimensionConfig = globals.dimensions.find(d => d.name === dimension);
        if (!dimensionConfig) {
            throw new Error(`Dimension "${dimension}" not found in globals`);
        }
        const output = {
            dimension,
            description: dimensionConfig.description,
            identifiers: dimensionConfig.identifiers,
            events: data.events
        };
        if (includeEventDetails) {
            output.eventDetails = data.eventDetails;
        }
        return output;
    });
}
function getAllDimensions(options = {}) {
    const config = (0, analyticsConfigHelper_1.getAnalyticsConfig)();
    let dimensionMap = {};
    let dimensionEventCounts = {};
    let isFirstConfig = true;
    let globals;
    // Process all generation configs
    for (const genConfig of config.generates) {
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
    }
    if (!globals) {
        throw new Error("No globals configuration found");
    }
    return formatDimensionOutput(dimensionMap, globals, options.includeEventDetails || options.verbose || false);
}
