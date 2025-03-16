"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAnalyticsTracker = createAnalyticsTracker;
// Validate event properties dynamically
function validateEventProperties(event, properties) {
    if (!event) {
        throw new Error(`❌ Event not found`);
    }
    const expectedProperties = event.properties || [];
    const requiredProps = new Set(expectedProperties.map((p) => p.name));
    for (const key in properties) {
        if (!requiredProps.has(key)) {
            throw new Error(`❌ Unexpected property "${key}". Allowed properties: ${[...requiredProps].join(", ")}`);
        }
    }
    console.log("✅ Event properties validated successfully.");
}
function createAnalyticsTracker(events) {
    return {
        track: (eventKey, properties) => {
            validateEventProperties(events[eventKey], properties);
            console.log("📊 Tracking event:", JSON.stringify({ eventKey, properties }, null, 2));
            // Future: Send event data to an endpoint
        }
    };
}
