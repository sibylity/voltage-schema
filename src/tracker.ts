import { type Event, type AnalyticsTracker } from './types';

// Validate event properties dynamically
function validateEventProperties(event: Event | undefined, properties: Record<string, any>) {
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

export function createAnalyticsTracker(events: Record<string, Event>): AnalyticsTracker {
  return {
    track: (eventKey: string, properties: Record<string, any>) => {
      validateEventProperties(events[eventKey], properties);
      console.log("📊 Tracking event:", JSON.stringify({ eventKey, properties }, null, 2));
      // Future: Send event data to an endpoint
    }
  };
}
