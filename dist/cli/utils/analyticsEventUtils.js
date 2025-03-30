"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllEvents = getAllEvents;
const analyticsConfigHelper_1 = require("./analyticsConfigHelper");
function getDimensionDetails(dimensionName, dimensions) {
    return dimensions.find(dim => dim.name === dimensionName);
}
function processEvent(eventKey, event, includeGroups, includeDimensions, groups, dimensions) {
    const eventProperties = (event.properties || []).map(prop => (Object.assign(Object.assign({}, prop), { source: "event" })));
    let allProperties = [...eventProperties];
    if (includeGroups && groups) {
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
    const output = {
        key: eventKey,
        name: event.name,
        description: event.description,
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
function getAllEvents(options = {}) {
    const { includeGroups = false, includeDimensions = false, verbose = false } = options;
    const effectiveIncludeGroups = verbose || includeGroups;
    const effectiveIncludeDimensions = verbose || includeDimensions;
    const config = (0, analyticsConfigHelper_1.getAnalyticsConfig)();
    const events = [];
    // Process all generation configs
    for (const genConfig of config.generates) {
        const { events: eventsData, globals } = (0, analyticsConfigHelper_1.readGenerationConfigFiles)(genConfig);
        // Process each event
        Object.entries(eventsData.events).forEach(([eventKey, event]) => {
            events.push(processEvent(eventKey, event, effectiveIncludeGroups, effectiveIncludeDimensions, globals.groups, globals.dimensions));
        });
    }
    // Sort events alphabetically by name
    events.sort((a, b) => a.name.localeCompare(b.name));
    return events;
}
