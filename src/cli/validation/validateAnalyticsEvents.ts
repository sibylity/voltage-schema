import fs from "fs";
import path from "path";
import Ajv from "ajv";
import { type AnalyticsEvents, type Event } from "../../types";

const ajv = new Ajv();

// Load events schema
const eventsSchemaPath = path.resolve(__dirname, "../../schemas/analytics.events.schema.json");
const eventsSchema = JSON.parse(fs.readFileSync(eventsSchemaPath, "utf8"));
const validateEventsSchema = ajv.compile(eventsSchema);

function validateEventProperties(event: Event, eventKey: string): boolean {
  let isValid = true;

  if (event.properties) {
    event.properties.forEach((prop) => {
      if (!prop.name || !prop.type) {
        console.error(`❌ Property in event "${eventKey}" is missing required fields (name, type).`);
        isValid = false;
      }
    });
  }

  return isValid;
}

function validateEventDimensions(event: Event, eventKey: string, validDimensions: Set<string>, globalsExist: boolean): boolean {
  let isValid = true;

  if (event.dimensions && event.dimensions.length > 0) {
    if (!globalsExist) {
      console.warn(`⚠️ Event "${eventKey}" specifies dimensions but no globals file exists.`);
    }
    
    event.dimensions.forEach((dim) => {
      if (!validDimensions.has(dim)) {
        console.error(`❌ Invalid dimension "${dim}" in event "${eventKey}". It is not listed in globals.dimensions.`);
        isValid = false;
      }
    });
  }

  return isValid;
}

export function validateEvents(eventsPath: string, validDimensions: Set<string>, globalsExist: boolean): boolean {
  if (!fs.existsSync(eventsPath)) {
    console.error(`❌ Events file not found: ${eventsPath}`);
    return false;
  }

  let events: AnalyticsEvents;
  try {
    events = JSON.parse(fs.readFileSync(eventsPath, "utf8")) as AnalyticsEvents;
  } catch (error) {
    console.error(`❌ Failed to parse events file at ${eventsPath}:`, error);
    return false;
  }

  // Validate events schema
  if (!validateEventsSchema(events)) {
    console.error(`❌ Events schema validation failed for ${eventsPath}:`, validateEventsSchema.errors);
    return false;
  }

  let isValid = true;

  // Validate each event
  Object.entries(events.events).forEach(([eventKey, event]) => {
    console.log(`🔍 Validating event: ${eventKey}`);
    
    const propertiesValid = validateEventProperties(event, eventKey);
    const dimensionsValid = validateEventDimensions(event, eventKey, validDimensions, globalsExist);
    
    if (!propertiesValid || !dimensionsValid) {
      isValid = false;
    }
  });

  return isValid;
} 