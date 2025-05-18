import type {
  AnalyticsTracker,
  TrackerEvents,
  TrackerEvent,
  EventProperties,
  TrackerOptions,
  TrackerGroup,
  GroupProperties,
  HasProperties
} from './types';

export interface RuntimeEvent {
  name: string;
  properties?: Array<{
    name: string;
    type: string | string[];
    optional?: boolean;
    defaultValue?: any;
  }>;
  meta?: Record<string, string | number | boolean>;
  passthrough?: boolean;
}

export interface TrackerContext<T extends TrackerEvents> {
  events: Record<string, RuntimeEvent>;
  groups: Record<string, RuntimeEvent>;
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

type PropertyValue = string | number | boolean | (() => string | number | boolean);

function resolveProperties(properties: Record<string, PropertyValue>): Record<string, string | number | boolean> {
  return Object.fromEntries(
    Object.entries(properties).map(([key, value]) => [
      key,
      typeof value === 'function' ? value() : value
    ])
  );
}

function validateEventProperties(event: RuntimeEvent, properties: Record<string, any>): void {
  if (!event.properties) {
    return;
  }

  for (const prop of event.properties) {
    if (!prop.optional && !(prop.name in properties) && prop.defaultValue === undefined) {
      throw new ValidationError(`Required property "${prop.name}" is missing`);
    }

    if (prop.name in properties) {
      const value = properties[prop.name];
      const type = Array.isArray(prop.type) ? prop.type : [prop.type];

      if (!type.some(t => {
        if (t === 'string') return typeof value === 'string';
        if (t === 'number') return typeof value === 'number';
        if (t === 'boolean') return typeof value === 'boolean';
        return value === t;
      })) {
        throw new ValidationError(
          `Property "${prop.name}" has invalid type. Expected ${type.join(' | ')}, got ${typeof value}`
        );
      }
    }
  }
}

function validateGroupProperties(group: RuntimeEvent, properties: Record<string, any>): void {
  if (!group.properties) {
    return;
  }

  for (const prop of group.properties) {
    if (!prop.optional && !(prop.name in properties) && prop.defaultValue === undefined) {
      throw new ValidationError(`Required property "${prop.name}" is missing`);
    }

    if (prop.name in properties) {
      const value = properties[prop.name];
      const type = Array.isArray(prop.type) ? prop.type : [prop.type];

      if (!type.some(t => {
        if (t === 'string') return typeof value === 'string';
        if (t === 'number') return typeof value === 'number';
        if (t === 'boolean') return typeof value === 'boolean';
        return value === t;
      })) {
        throw new ValidationError(
          `Property "${prop.name}" has invalid type. Expected ${type.join(' | ')}, got ${typeof value}`
        );
      }
    }
  }
}

export function createAnalyticsTracker<T extends TrackerEvents>(
  context: TrackerContext<T>,
  options: TrackerOptions<T>
): AnalyticsTracker<T> {
  const {
    onEventTracked,
    onGroupUpdated,
    onError = console.error
  } = options;

  const groupProperties = {} as Record<TrackerGroup<T>, GroupProperties<T, TrackerGroup<T>>>;

  return {
    track: <E extends TrackerEvent<T>>(
      eventKey: E,
      ...args: HasProperties<T, E> extends true ? [eventProperties: EventProperties<T, E>] : []
    ) => {
      try {
        const event = context.events[eventKey as string];
        if (!event) {
          throw new ValidationError(`Event "${String(eventKey)}" not found`);
        }

        const eventProperties = args[0] as EventProperties<T, E> | undefined;

        // Validate properties
        validateEventProperties(event, eventProperties || {});

        // Send the event
        try {
          const eventName = event.name as T["events"][E]["name"];

          // Create a new object with default values
          const propertiesWithDefaults: Record<string, PropertyValue> = {};

          // Add default values first
          if (event.properties) {
            event.properties.forEach((prop: { name: string; defaultValue?: any }) => {
              if (prop.defaultValue !== undefined) {
                propertiesWithDefaults[prop.name] = prop.defaultValue;
              }
            });
          }

          // Override with provided properties
          if (eventProperties) {
            Object.assign(propertiesWithDefaults, eventProperties);
          }

          const resolvedEventProperties = resolveProperties(propertiesWithDefaults) as T["events"][E]["properties"];
          const resolvedGroupProperties = Object.fromEntries(
            Object.entries(groupProperties).map(([key, props]) => [
              key,
              resolveProperties(props as Record<string, PropertyValue>)
            ])
          ) as { [K in TrackerGroup<T>]: T["groups"][K]["properties"] };

          onEventTracked<E>(eventName, {
            properties: resolvedEventProperties,
            meta: event.meta as T["events"][E]["meta"],
            groups: resolvedGroupProperties
          });
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
        const group = context.groups[groupName as string];
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

          // Create a new object with default values
          const propertiesWithDefaults: Record<string, PropertyValue> = {};

          // Add default values first
          if (group.properties) {
            group.properties.forEach((prop: { name: string; defaultValue?: any }) => {
              if (prop.defaultValue !== undefined) {
                propertiesWithDefaults[prop.name] = prop.defaultValue;
              }
            });
          }

          // Override with provided properties
          Object.assign(propertiesWithDefaults, properties);

          const resolvedProperties = resolveProperties(propertiesWithDefaults) as T["groups"][G]["properties"];
          onGroupUpdated<G>(groupNameStr, resolvedProperties);
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
