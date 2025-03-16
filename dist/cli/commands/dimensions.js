"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDimensionsCommand = registerDimensionsCommand;
const validation_1 = require("../validation");
const analyticsConfigHelper_1 = require("../utils/analyticsConfigHelper");
function registerDimensionsCommand(program) {
    program
        .command("dimensions")
        .description("List all events grouped by dimension")
        .action(() => {
        console.log("🔍 Running validation before listing dimensions...");
        if (!(0, validation_1.validateAnalyticsFiles)()) {
            process.exit(1);
        }
        const config = (0, analyticsConfigHelper_1.getAnalyticsConfig)();
        // Initialize map of dimensions to event names
        const dimensionMap = {};
        // Track event counts per dimension
        const dimensionEventCounts = {};
        // Process all generation configs
        for (const genConfig of config.generates) {
            const { globals, events } = (0, analyticsConfigHelper_1.readGenerationConfigFiles)(genConfig);
            // Initialize any new dimensions from this config
            globals.dimensions.forEach((dim) => {
                if (!dimensionMap[dim.name]) {
                    dimensionMap[dim.name] = [];
                    dimensionEventCounts[dim.name] = {};
                }
            });
            // Populate dimensionMap with events
            Object.entries(events.events).forEach(([eventKey, event]) => {
                if (event.dimensions) {
                    event.dimensions.forEach((dim) => {
                        if (!dimensionMap[dim]) {
                            console.warn(`⚠️  Dimension "${dim}" in event "${eventKey}" is not listed in any globals.dimensions.`);
                            return;
                        }
                        // Handle duplicate events by tracking counts per dimension
                        dimensionEventCounts[dim][eventKey] = (dimensionEventCounts[dim][eventKey] || 0) + 1;
                        const count = dimensionEventCounts[dim][eventKey];
                        const displayName = count > 1
                            ? `${eventKey} (${count})`
                            : eventKey;
                        dimensionMap[dim].push(displayName);
                    });
                }
            });
        }
        // Convert to array format
        const dimensionList = Object.entries(dimensionMap).map(([dimension, events]) => ({
            dimension,
            events,
        }));
        console.log(JSON.stringify(dimensionList, null, 2));
    });
}
