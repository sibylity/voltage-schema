import type {
  AnalyticsTracker,
  Event,
  EventData,
  TrackerEvents,
  TrackerEvent,
  EventProps
} from './types';

export interface TrackerOptions {
  /** Function to send event data */
  send: (eventData: EventData) => void | Promise<void>;
  /** Optional function to handle errors */
  onError?: (error: Error) => void;
}

export interface TrackerContext<T extends TrackerEvents> {
  events: Record<TrackerEvent<T>, Event>;
}

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

function validateEventProperties(
  event: Event | undefined,
  properties: Record<string, any>
): void {
  if (!event) {
    throw new ValidationError(`Event not found`);
  }

  // Get all required properties
  const expectedProperties = new Set(
    (event.properties || []).map(p => p.name)
  );

  // Check for unexpected properties
  for (const key in properties) {
    if (!expectedProperties.has(key)) {
      throw new ValidationError(
        `Unexpected property "${key}". Allowed properties: ${[...expectedProperties].join(", ")}`
      );
    }
  }

  // Check property types if defined in event
  event.properties?.forEach(prop => {
    const value = properties[prop.name];
    if (value !== undefined) {
      const type = Array.isArray(prop.type) ? prop.type : [prop.type];
      const valueType = Array.isArray(value) ? 'array' : typeof value;
      if (!type.includes(valueType)) {
        throw new ValidationError(
          `Invalid type for property "${prop.name}". Expected ${type.join(' | ')}, got ${valueType}`
        );
      }
    }
  });
}

export function createAnalyticsTracker<T extends TrackerEvents>(
  context: TrackerContext<T>,
  options: TrackerOptions
): AnalyticsTracker<T> {
  const {
    send,
    onError = console.error
  } = options;

  return {
    track: <E extends TrackerEvent<T>>(
      eventKey: E,
      eventProperties: EventProps<T, E>
    ) => {
      try {
        const event = context.events[eventKey];
        if (!event) {
          throw new ValidationError(`Event "${eventKey}" not found`);
        }

        // Validate properties
        validateEventProperties(event, eventProperties);

        // Prepare event data
        const eventData: EventData = {
          eventKey,
          eventName: event.name,
          eventProperties,
        };

        // Send the event
        try {
          send(eventData);
        } catch (error) {
          onError(new Error(`Failed to send event: ${error instanceof Error ? error.message : String(error)}`));
        }
      } catch (error) {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
    }
  };
}
