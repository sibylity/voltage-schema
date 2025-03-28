"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerPropertiesCommand = registerPropertiesCommand;
const validation_1 = require("../validation");
const analyticsConfigHelper_1 = require("../utils/analyticsConfigHelper");
function processProperty(property, sourceName, sourceDescription, sourceType, propertyMap) {
    if (!propertyMap[property.name]) {
        propertyMap[property.name] = {
            types: new Set(),
            sources: []
        };
    }
    // Add the type to the set of types
    propertyMap[property.name].types.add(property.type);
    propertyMap[property.name].sources.push({
        type: sourceType,
        name: sourceName,
        description: sourceDescription,
        optional: property.optional
    });
}
function processEvent(eventKey, event, propertyMap) {
    if (!event.properties)
        return;
    event.properties.forEach((prop) => {
        processProperty(prop, eventKey, event.description, "event", propertyMap);
    });
}
function processGroup(groupKey, group, propertyMap) {
    group.properties.forEach((prop) => {
        processProperty(prop, groupKey, group.description, "group", propertyMap);
    });
}
function formatPropertyOutput(propertyMap) {
    return Object.entries(propertyMap).map(([property, data]) => ({
        property,
        types: Array.from(data.types),
        sources: data.sources
    }));
}
function registerPropertiesCommand(program) {
    program
        .command("properties")
        .description("List all properties across groups and events")
        .action(() => {
        try {
            console.log("🔍 Running validation before listing properties...");
            if (!(0, validation_1.validateAnalyticsFiles)()) {
                process.exit(1);
            }
            const config = (0, analyticsConfigHelper_1.getAnalyticsConfig)();
            const propertyMap = {};
            // Process all generation configs
            for (const genConfig of config.generates) {
                const { globals, events } = (0, analyticsConfigHelper_1.readGenerationConfigFiles)(genConfig);
                // Process each event
                Object.entries(events.events).forEach(([eventKey, event]) => {
                    processEvent(eventKey, event, propertyMap);
                });
                // Process each group
                globals.groups.forEach((group) => {
                    processGroup(group.name, group, propertyMap);
                });
            }
            // Format and output results
            const propertyList = formatPropertyOutput(propertyMap);
            console.log(JSON.stringify(propertyList, null, 2));
        }
        catch (error) {
            console.error("❌ Error processing properties:", error);
            process.exit(1);
        }
    });
}
