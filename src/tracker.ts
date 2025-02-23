import { type AnalyticsSchema, type AnalyticsTracker } from './types';
import fs from "fs";
import path from "path";

// Load and parse analytics.json
const analyticsPath = path.resolve(process.cwd(), "analytics.json");
if (!fs.existsSync(analyticsPath)) {
  throw new Error("❌ analytics.json file is missing. Please run `npm run init`.");
}
const analyticsData = JSON.parse(fs.readFileSync(analyticsPath, "utf8"));


// Validate event properties dynamically
function validateEventProperties(eventKey: string, properties: Record<string, any>) {
  const eventSchema = analyticsData.events[eventKey];
  if (!eventSchema) {
    throw new Error(`❌ Event key "${eventKey}" not found in analytics.json`);
  }

  const expectedProperties = eventSchema.properties || [];
  const requiredProps = new Set(expectedProperties.map((p: any) => p.name));

  for (const key in properties) {
    if (!requiredProps.has(key)) {
      throw new Error(`❌ Unexpected property "${key}" in event "${eventKey}". Allowed properties: ${[...requiredProps].join(", ")}`);
    }
  }

  console.log("✅ Event properties validated successfully.");
}

export function createAnalyticsTracker(schema: AnalyticsSchema): AnalyticsTracker {
  return {
    track: (eventKey: string, properties: Record<string, any>) => {
      validateEventProperties(eventKey, properties);
      console.log("📊 Tracking event:", JSON.stringify({ eventKey, properties }, null, 2));
      // Future: Send event data to an endpoint
    }
  };
}
