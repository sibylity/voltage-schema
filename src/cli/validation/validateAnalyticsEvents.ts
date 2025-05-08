import fs from "fs";
import path from "path";
import type { ErrorObject } from "ajv";
import { type AnalyticsEvents, type Event } from "../../types";
import { type ValidationResult, } from "./types";
import { createValidator } from "./schemaValidation";
import { parseSchemaFile, validateFileExists } from "./fileValidation";
import { logValidationStart, logValidationSuccess, logValidationErrors } from "./logging";

const validateEventsSchema = createValidator(path.resolve(__dirname, "../../schemas/analytics.events.schema.json"));

function validateEventProperties(event: any, eventKey: string): ValidationResult<AnalyticsEvents> {
  const errors: string[] = [];

  if (!event.properties) {
    return { isValid: true, data: { events: {} } };
  }

  const propertyNames = new Set<string>();
  for (const prop of event.properties) {
    if (propertyNames.has(prop.name)) {
      errors.push(`Duplicate property name "${prop.name}" in event "${eventKey}"`);
    } else {
      propertyNames.add(prop.name);
    }
  }

  return errors.length > 0 ? { isValid: false, errors } : { isValid: true, data: { events: {} } };
}

function validateEventDimensions(
  event: any,
  eventKey: string,
  validDimensions: string[],
  globalsExist: boolean
): ValidationResult<AnalyticsEvents> {
  const errors: string[] = [];

  if (!event.dimensions) {
    return { isValid: true, data: { events: {} } };
  }

  if (!globalsExist) {
    errors.push(`Event "${eventKey}" has dimensions but no dimensions file is provided`);
    return { isValid: false, errors };
  }

  const { inclusive, exclusive } = event.dimensions;
  if (inclusive && exclusive) {
    errors.push(`Event "${eventKey}" cannot have both inclusive and exclusive dimensions`);
    return { isValid: false, errors };
  }

  const dimensions = inclusive || exclusive || [];
  for (const dim of dimensions) {
    if (!validDimensions.includes(dim)) {
      errors.push(`Invalid dimension "${dim}" in event "${eventKey}"`);
    }
  }

  return errors.length > 0 ? { isValid: false, errors } : { isValid: true, data: { events: {} } };
}

export function validateEvents(
  eventsPath: string,
  validDimensions: string[],
  globalsExist: boolean
): ValidationResult<AnalyticsEvents> {
  const context = { filePath: eventsPath };
  logValidationStart(context);

  // Check if events file exists
  const existsResult = validateFileExists(eventsPath);
  if (!existsResult.isValid) {
    if (existsResult.errors) {
      logValidationErrors(existsResult.errors);
    }
    return { isValid: false, errors: existsResult.errors };
  }

  // Parse events file
  const parseResult = parseSchemaFile<AnalyticsEvents>(eventsPath);
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
    const propertiesResult = validateEventProperties(event, eventKey);
    const dimensionsResult = validateEventDimensions(event, eventKey, validDimensions, globalsExist);

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
  return { isValid: true, data: events };
} 