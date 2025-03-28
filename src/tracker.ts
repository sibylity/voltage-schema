import type {
  AnalyticsTracker,
  TrackerEvents,
  TrackerEvent,
  EventProperties,
  TrackerOptions,
  TrackerGroup,
  GroupProperties,
  GlobalProperties
} from './types';

export interface RuntimeEvent {
  name: string;
  properties?: Array<{
    name: string;
    type: string | string[];
    optional?: boolean;
  }>;
  passthrough?: boolean;
}

export interface RuntimeGroup {
  name: string;
  properties: Array<{
    name: string;
    type: string | string[];
    optional?: boolean;
  }>;
  passthrough?: boolean;
}

export interface TrackerContext<T extends TrackerEvents> {
  events: Record<string, RuntimeEvent>;
  groups: Record<string, RuntimeGroup>;
  properties: Record<string, () => any>;
}

export function createAnalyticsTracker<T extends TrackerEvents>(
  context: TrackerContext<T>,
  options: TrackerOptions<T>
): AnalyticsTracker<T> {
  const {
    trackEvent,
    groupIdentify,
    onError = console.error
  } = options;

  let globalProperties: Partial<GlobalProperties<T>> = {};
  let groupProperties: Record<TrackerGroup<T>, GroupProperties<T, TrackerGroup<T>>> = {} as Record<TrackerGroup<T>, GroupProperties<T, TrackerGroup<T>>>;

  return {
    track: <E extends TrackerEvent<T>>(
      eventKey: E,
      eventProperties: EventProperties<T, E>
    ) => {
      try {
        const event = context.events[eventKey];
        if (!event) {
          throw new ValidationError(`Event "${eventKey}" not found`);
        }

        // Validate properties
        validateEventProperties(event, eventProperties);

        // Send the event
        try {
          trackEvent(event.name, eventProperties, globalProperties as GlobalProperties<T>, groupProperties);
        } catch (error) {
          onError(new Error(`Failed to send event: ${error instanceof Error ? error.message : String(error)}`));
        }
      } catch (error) {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
    },

    group: <G extends TrackerGroup<T>>(
      groupName: G,
      groupIdentifier: string | number,
      properties: GroupProperties<T, G>
    ) => {
      try {
        const group = context.groups[groupName];
        if (!group) {
          throw new ValidationError(`Group "${String(groupName)}" not found`);
        }

        // Validate properties
        validateGroupProperties(group, properties);

        // Update group properties
        groupProperties[groupName] = properties;

        // Send the group data
        try {
          groupIdentify(group.name, groupIdentifier, properties as Record<string, any>);
        } catch (error) {
          onError(new Error(`Failed to group: ${error instanceof Error ? error.message : String(error)}`));
        }
      } catch (error) {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
    },

    setProperties: (properties: Partial<{
      [K in keyof GlobalProperties<T>]: GlobalProperties<T>[K] | (() => GlobalProperties<T>[K]);
    }>) => {
      try {
        // Update the global properties
        globalProperties = Object.entries(properties).reduce((acc, [key, getter]) => {
          try {
            acc[key as keyof GlobalProperties<T>] = typeof getter === 'function' ? getter() : getter;
          } catch (error) {
            onError(new Error(`Failed to get property "${key}": ${error instanceof Error ? error.message : String(error)}`));
          }
          return acc;
        }, {} as Partial<GlobalProperties<T>>);
      } catch (error) {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
    }
  };
}

// Helper functions for validation
function validateEventProperties(event: RuntimeEvent, properties: Record<string, any>) {
  if (!event.properties) return;

  // Skip unexpected property validation if passthrough is enabled
  if (!event.passthrough) {
    // Check for unexpected properties
    const expectedProperties = new Set(event.properties.map(p => p.name));
    for (const key in properties) {
      if (!expectedProperties.has(key)) {
        throw new ValidationError(`Unexpected property "${key}". Allowed properties: ${[...expectedProperties].join(", ")}`);
      }
    }
  }

  // Check required properties
  for (const prop of event.properties) {
    if (!prop.optional && !(prop.name in properties)) {
      throw new ValidationError(`Required property "${prop.name}" is missing`);
    }
  }
}

function validateGroupProperties(group: RuntimeGroup, properties: Record<string, any>) {
  if (!group.properties) return;

  // Skip unexpected property validation if passthrough is enabled
  if (!group.passthrough) {
    // Check for unexpected properties
    const expectedProperties = new Set(group.properties.map(p => p.name));
    for (const key in properties) {
      if (!expectedProperties.has(key)) {
        throw new ValidationError(`Unexpected property "${key}". Allowed properties: ${[...expectedProperties].join(", ")}`);
      }
    }
  }

  // Check required properties
  for (const prop of group.properties) {
    if (!prop.optional && !(prop.name in properties)) {
      throw new ValidationError(`Required property "${prop.name}" is missing`);
    }
  }
}

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
