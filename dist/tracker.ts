import type {
  AnalyticsTracker,
  TrackerEvents,
  TrackerEvent,
  EventProperties,
  TrackerOptions,
  TrackerGroup,
  GroupProperties
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
  events: Record<TrackerEvent<T>, RuntimeEvent>;
  groups: Record<TrackerGroup<T>, RuntimeGroup>;
}

export function createAnalyticsTracker<T extends TrackerEvents>(
  context: TrackerContext<T>,
  options: TrackerOptions<T>
): AnalyticsTracker<T> {
  const {
    onEventTracked,
    onGroupUpdate,
    onError = console.error
  } = options;

  const groupProperties = {} as Record<TrackerGroup<T>, GroupProperties<T, TrackerGroup<T>>>;

  return {
    track: <E extends TrackerEvent<T>>(
      eventKey: E,
      eventProperties: EventProperties<T, E>
    ) => {
      try {
        const event = context.events[eventKey];
        if (!event) {
          throw new ValidationError(`Event "${String(eventKey)}" not found`);
        }

        // Validate properties
        validateEventProperties(event, eventProperties);

        // Send the event
        try {
          const eventName = event.name as T["events"][E]["name"];
          onEventTracked(eventName, eventProperties, groupProperties);
        } catch (error) {
          onError(new Error(`Failed to send event: ${error instanceof Error ? error.message : String(error)}`));
        }
      } catch (error) {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
    },

    setProperties: <G extends TrackerGroup<T>>(
      groupName: G,
      properties: Partial<GroupProperties<T, G>>
    ) => {
      try {
        const group = context.groups[groupName];
        if (!group) {
          throw new ValidationError(`Group "${String(groupName)}" not found`);
        }

        // Validate properties
        validateGroupProperties(group, properties);

        // Update group properties
        groupProperties[groupName] = {
          ...groupProperties[groupName],
          ...properties
        } as GroupProperties<T, G>;

        // Send the group data
        try {
          const groupNameStr = group.name as T["groups"][G]["name"];
          onGroupUpdate(groupNameStr, properties);
        } catch (error) {
          onError(new Error(`Failed to update group: ${error instanceof Error ? error.message : String(error)}`));
        }
      } catch (error) {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
    },

    getProperties: () => groupProperties
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
