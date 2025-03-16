"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDimensionsCommand = registerDimensionsCommand;
const validation_1 = require("../validation");
const analyticsConfigHelper_1 = require("../utils/analyticsConfigHelper");
function initializeDimensionMaps(globals) {
    const dimensionMap = {};
    const dimensionEventCounts = {};
    globals.dimensions.forEach((dim) => {
        dimensionMap[dim.name] = [];
        dimensionEventCounts[dim.name] = {};
    });
    return { dimensionMap, dimensionEventCounts };
}
function processEvent(eventKey, event, dimensionMap, dimensionEventCounts) {
    if (!event.dimensions)
        return;
    event.dimensions.forEach((dim) => {
        if (!dimensionMap[dim]) {
            console.warn(`⚠️  Dimension "${dim}" in event "${eventKey}" is not listed in any globals.dimensions.`);
            return;
        }
        // Track event count for this dimension
        dimensionEventCounts[dim][eventKey] = (dimensionEventCounts[dim][eventKey] || 0) + 1;
        const count = dimensionEventCounts[dim][eventKey];
        // Add event to dimension map with count if needed
        const displayName = count > 1 ? `${eventKey} (${count})` : eventKey;
        dimensionMap[dim].push(displayName);
    });
}
function formatDimensionOutput(dimensionMap) {
    return Object.entries(dimensionMap).map(([dimension, events]) => ({
        dimension,
        events,
    }));
}
function registerDimensionsCommand(program) {
    program
        .command("dimensions")
        .description("List all events grouped by dimension")
        .action(() => {
        try {
            console.log("🔍 Running validation before listing dimensions...");
            if (!(0, validation_1.validateAnalyticsFiles)()) {
                process.exit(1);
            }
            const config = (0, analyticsConfigHelper_1.getAnalyticsConfig)();
            let dimensionMap = {};
            let dimensionEventCounts = {};
            let isFirstConfig = true;
            // Process all generation configs
            for (const genConfig of config.generates) {
                const { globals, events } = (0, analyticsConfigHelper_1.readGenerationConfigFiles)(genConfig);
                // Initialize maps only from the first config that has dimensions
                if (isFirstConfig || Object.keys(dimensionMap).length === 0) {
                    ({ dimensionMap, dimensionEventCounts } = initializeDimensionMaps(globals));
                    isFirstConfig = false;
                }
                // Process each event in the current config
                Object.entries(events.events).forEach(([eventKey, event]) => {
                    processEvent(eventKey, event, dimensionMap, dimensionEventCounts);
                });
            }
            // Format and output results
            const dimensionList = formatDimensionOutput(dimensionMap);
            console.log(JSON.stringify(dimensionList, null, 2));
        }
        catch (error) {
            console.error("❌ Error processing dimensions:", error);
            process.exit(1);
        }
    });
}
