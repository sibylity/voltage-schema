"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerEventsCommand = registerEventsCommand;
const validation_1 = require("../validation");
const analyticsConfigHelper_1 = require("../utils/analyticsConfigHelper");
function getDimensionDetails(dimensionName, dimensions) {
    return dimensions.find(dim => dim.name === dimensionName);
}
function processEvent(eventKey, event, includeGroups, includeDimensions, groups, dimensions) {
    const eventProperties = (event.properties || []).map(prop => (Object.assign(Object.assign({}, prop), { source: "event" })));
    let allProperties = [...eventProperties];
    if (includeGroups && groups) {
        const groupProperties = groups.flatMap(group => (group.properties || []).map(prop => (Object.assign(Object.assign({}, prop), { source: "group" }))));
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
    const output = {
        key: eventKey,
        name: event.name,
        description: event.description,
        version: event.version,
        properties: allProperties,
        passthrough: event.passthrough
    };
    if (includeDimensions && dimensions && event.dimensions) {
        output.dimensions = event.dimensions
            .map(dimName => getDimensionDetails(dimName, dimensions))
            .filter((dim) => dim !== undefined);
    }
    return output;
}
function registerEventsCommand(program) {
    program
        .command("events")
        .description("List all events with their properties and dimensions")
        .option("--include-groups", "Include properties from all groups")
        .option("--include-dimensions", "Include detailed dimension information")
        .action((options) => {
        try {
            console.log("🔍 Running validation before listing events...");
            if (!(0, validation_1.validateAnalyticsFiles)()) {
                process.exit(1);
            }
            const config = (0, analyticsConfigHelper_1.getAnalyticsConfig)();
            const events = [];
            // Process all generation configs
            for (const genConfig of config.generates) {
                const { events: eventsData, globals } = (0, analyticsConfigHelper_1.readGenerationConfigFiles)(genConfig);
                // Process each event
                Object.entries(eventsData.events).forEach(([eventKey, event]) => {
                    events.push(processEvent(eventKey, event, options.includeGroups, options.includeDimensions, globals.groups, globals.dimensions));
                });
            }
            // Sort events alphabetically by name
            events.sort((a, b) => a.name.localeCompare(b.name));
            // Format and output results
            console.log(JSON.stringify(events, null, 2));
        }
        catch (error) {
            console.error("❌ Error processing events:", error);
            process.exit(1);
        }
    });
}
