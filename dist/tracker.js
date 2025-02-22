"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAnalyticsTracker = createAnalyticsTracker;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Load and parse analytics.json
const analyticsPath = path_1.default.resolve(process.cwd(), "analytics.json");
if (!fs_1.default.existsSync(analyticsPath)) {
    throw new Error("❌ analytics.json file is missing. Please run `npm run init`.");
}
const analyticsData = JSON.parse(fs_1.default.readFileSync(analyticsPath, "utf8"));
// Validate event properties dynamically
function validateEventProperties(eventKey, properties) {
    const eventSchema = analyticsData.events[eventKey];
    if (!eventSchema) {
        throw new Error(`❌ Event key "${eventKey}" not found in analytics.json`);
    }
    const expectedProperties = eventSchema.properties || [];
    const requiredProps = new Set(expectedProperties.map((p) => p.name));
    for (const key in properties) {
        if (!requiredProps.has(key)) {
            throw new Error(`❌ Unexpected property "${key}" in event "${eventKey}". Allowed properties: ${[...requiredProps].join(", ")}`);
        }
    }
    console.log("✅ Event properties validated successfully.");
}
function createAnalyticsTracker(schema) {
    return {
        track: (eventKey, properties) => {
            validateEventProperties(eventKey, properties);
            console.log("📊 Tracking event:", JSON.stringify({ eventKey, properties }, null, 2));
            // Future: Send event data to an endpoint
        }
    };
}
