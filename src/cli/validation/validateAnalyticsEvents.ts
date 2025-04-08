import fs from "fs";
import path from "path";
import type { ErrorObject } from "ajv";
import { type AnalyticsEvents, type Event } from "../../types";
import { type ValidationResult, } from "./types";
import { createValidator } from "./schemaValidation";
import { parseJsonFile, validateFileExists } from "./fileValidation";
import { logValidationStart, logValidationSuccess, logValidationErrors } from "./logging";

const validateEventsSchema = createValidator(path.resolve(__dirname, "../../schemas/analytics.events.schema.json"));

function validateEventProperties(event: Event, eventKey: string): ValidationResult<void> {
  const errors: string[] = [];

  if (event.properties) {
    event.properties.forEach((prop) => {
      if (!prop.name || !prop.type) {
        errors.push(`Property in event "${eventKey}" is missing required fields (name, type).`);
      }
    });
  }

  return errors.length > 0 ? { isValid: false, errors } : { isValid: true };
}

function validateEventDimensions(
  event: Event,
  eventKey: string,
  validDimensions: Set<string>,
  globalsExist: boolean
): ValidationResult<void> {
  const errors: string[] = [];

  if (event.dimensions && event.dimensions.length > 0) {
    if (!globalsExist) {
      console.warn(`⚠️ Event "${eventKey}" specifies dimensions but no globals file exists.`);
    }
    
    event.dimensions.forEach((dim) => {
      if (!validDimensions.has(dim)) {
        errors.push(`Invalid dimension "${dim}" in event "${eventKey}". It is not listed in dimensions.`);
      }
    });
  }

  return errors.length > 0 ? { isValid: false, errors } : { isValid: true };
}

export function validateEvents(
  eventsPath: string,
  validDimensions: Set<string>,
  globalsExist: boolean
): ValidationResult<void> {
  const context = { filePath: eventsPath };
  logValidationStart(context);

  // Check if events file exists
  const existsResult = validateFileExists(eventsPath);
  if (!existsResult.isValid) {
    if (existsResult.errors) {
      logValidationErrors(existsResult.errors);
    }
    return existsResult;
  }

  // Parse events file
  const parseResult = parseJsonFile<AnalyticsEvents>(eventsPath);
  if (!parseResult.isValid || !parseResult.data) {
    if (parseResult.errors) {
      logValidationErrors(parseResult.errors);
    }
    return { isValid: false, errors: parseResult.errors };
  }

  const events = parseResult.data;

  // Validate events schema
  if (!validateEventsSchema(events)) {
    const errors = validateEventsSchema.errors?.map((error: ErrorObject) => 
      `Events schema validation failed: ${error.message || "Unknown error"} at ${error.instancePath}`
    ) || ["Unknown schema validation error"];
    logValidationErrors(errors);
    return { isValid: false, errors };
  }

  const errors: string[] = [];

  // Validate each event
  Object.entries(events.events).forEach(([eventKey, event]) => {
    console.log(`🔍 Validating event: ${eventKey}`);
    
    const propertiesResult = validateEventProperties(event as Event, eventKey);
    const dimensionsResult = validateEventDimensions(event as Event, eventKey, validDimensions, globalsExist);
    
    if (!propertiesResult.isValid && propertiesResult.errors) {
      errors.push(...propertiesResult.errors);
    }
    if (!dimensionsResult.isValid && dimensionsResult.errors) {
      errors.push(...dimensionsResult.errors);
    }
  });

  if (errors.length > 0) {
    logValidationErrors(errors);
    return { isValid: false, errors };
  }

  logValidationSuccess(context);
  return { isValid: true };
} 