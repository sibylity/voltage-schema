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
        passthrough: event.passthrough,
        meta: event.meta
    };
    if (includeDimensions && dimensions) {
        // If event has no dimensions field, include it in all dimensions
        if (!event.dimensions) {
            // Include all actual dimensions
            output.dimensions = dimensions.map(dim => ({
                name: dim.name,
                description: dim.description,
                identifiers: dim.identifiers || { AND: [], OR: [] }
            }));
        }
        // If event has an empty dimensions array, add it to "Ungrouped" dimension
        else if (Array.isArray(event.dimensions) && event.dimensions.length === 0) {
            // Add a special "Ungrouped" dimension to indicate this event has no dimensions
            output.dimensions = [
                {
                    name: "Ungrouped",
                    description: "Events with explicit empty dimensions array",
                    identifiers: { AND: [], OR: [] }
                }
            ];
        }
        // If event has explicit dimensions
        else if (Array.isArray(event.dimensions)) {
            output.dimensions = event.dimensions
                .map((dimName) => getDimensionDetails(dimName, dimensions))
                .filter((dim) => dim !== undefined);
        }
        // Handle the new dimensions format with included/excluded arrays
        else if (typeof event.dimensions === 'object') {
            const dimensionsObj = event.dimensions;
            if (dimensionsObj.included && Array.isArray(dimensionsObj.included)) {
                output.dimensions = dimensionsObj.included
                    .map((dimName) => getDimensionDetails(dimName, dimensions))
                    .filter((dim) => dim !== undefined);
            }
            else if (dimensionsObj.excluded && Array.isArray(dimensionsObj.excluded)) {
                // For excluded dimensions, we need to include all dimensions except the excluded ones
                const excludedDims = new Set(dimensionsObj.excluded);
                output.dimensions = dimensions
                    .filter(dim => !excludedDims.has(dim.name))
                    .map(dim => ({
                    name: dim.name,
                    description: dim.description,
                    identifiers: dim.identifiers || { AND: [], OR: [] }
                }));
            }
        }
    }
    return output;
}
function getAllEvents(options = {}) {
    var _a, _b;
    const effectiveIncludeGroups = (_a = options.includeGroups) !== null && _a !== void 0 ? _a : true;
    const effectiveIncludeDimensions = (_b = options.includeDimensions) !== null && _b !== void 0 ? _b : true;
    // Process all generation configs
    const config = (0, analyticsConfigHelper_1.getAnalyticsConfig)();
    const events = [];
    config.generates.forEach(genConfig => {
        const { events: eventsData, globals } = (0, analyticsConfigHelper_1.readGenerationConfigFiles)(genConfig);
        // Process each event
        Object.entries(eventsData.events).forEach(([eventKey, event]) => {
            events.push(processEvent(eventKey, event, effectiveIncludeGroups, effectiveIncludeDimensions, globals.groups, globals.dimensions));
        });
    });
    // Sort events alphabetically by name
    events.sort((a, b) => a.name.localeCompare(b.name));
    return events;
}
