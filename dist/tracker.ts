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

interface PropertyValue<T> {
  value: T;
  isFunction: boolean;
  lastResolved?: T;
}

/**
 * Resolves all property values, handling both sync and async values
 */
async function resolveProperties<T extends Record<string, any>>(properties: T): Promise<T> {
  const entries = Object.entries(properties);
  const promises = entries.map(async ([key, value]) => {
    try {
      // If value is a function, call it
      if (typeof value === 'function') {
        value = value();
      }
      // If value is a promise, await it
      if (value instanceof Promise) {
        value = await value;
      }
      return [key, value];
    } catch (error) {
      // Re-throw with context about which property failed
      throw new Error(`Failed to resolve property "${key}": ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  try {
    const resolvedEntries = await Promise.all(promises);
    return Object.fromEntries(resolvedEntries) as T;
  } catch (error) {
    // Re-throw the error to be caught by the calling function
    throw error;
  }
}

export function createAnalyticsTracker<T extends TrackerEvents>(
  config: TrackerContext<T>,
  options: TrackerOptions<T>
): AnalyticsTracker<T> {
  const { onEventTracked, onGroupUpdated, onError = console.error } = options;

  // Initialize groupProperties with empty objects for each group
  const groupProperties = Object.keys(config.groups || {}).reduce((acc, groupName) => {
    acc[groupName as TrackerGroup<T>] = {} as Record<string, PropertyValue<any>>;
    return acc;
  }, {} as Record<TrackerGroup<T>, Record<string, PropertyValue<any>>>);

  return {
    track: async <E extends TrackerEvent<T>>(
      eventKey: E,
      ...args: HasProperties<T, E> extends true ? [eventProperties: EventProperties<T, E>] : []
    ) => {
      const event = config.events[String(eventKey)];
      if (!event) {
        throw new Error(`Event "${String(eventKey)}" not found in tracking config`);
      }

      try {
        // Start with default values
        const properties = { ...args[0] } as Record<string, any>;
        if (event.properties) {
          for (const prop of event.properties) {
            if (prop.defaultValue !== undefined && !(prop.name in properties)) {
              properties[prop.name] = prop.defaultValue;
            }
          }
        }

        // Resolve event properties if provided
        const resolvedProperties = await resolveProperties(properties);

        // Resolve all group properties
        const resolvedGroups = await Promise.all(
          Object.entries(groupProperties).map(async ([groupName, props]) => {
            const resolvedProps = await Promise.all(
              Object.entries(props).map(async ([key, propValue]) => {
                let value = propValue.value;
                if (propValue.isFunction) {
                  const resolved = await resolveProperties({ [key]: value });
                  value = resolved[key];
                  // Update the last resolved value
                  propValue.lastResolved = value;
                } else {
                  // For non-function properties, use the value directly
                  value = propValue.value;
                }
                return [key, value];
              })
            );
            return [groupName, Object.fromEntries(resolvedProps)];
          })
        );

        onEventTracked(event.name as T["events"][E]["name"], {
          properties: resolvedProperties as T["events"][E]["properties"],
          meta: event.meta as T["events"][E]["meta"],
          groups: Object.fromEntries(resolvedGroups) as { [K in TrackerGroup<T>]: T["groups"][K]["properties"] }
        });
      } catch (error) {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
    },

    setProperties: async <G extends TrackerGroup<T>>(
      groupName: G,
      properties: GroupProperties<T, G>
    ) => {
      const group = config.groups[String(groupName)];
      if (!group) {
        throw new Error(`Group "${String(groupName)}" not found in tracking config`);
      }

      try {
        // Start with existing properties and merge in new ones
        const existingProps = groupProperties[groupName] || {};
        const groupProps = { ...existingProps } as Record<string, PropertyValue<any>>;

        // Process each new property
        for (const [key, value] of Object.entries(properties)) {
          groupProps[key] = {
            value,
            isFunction: typeof value === 'function'
          };
        }

        if (group.properties) {
          for (const prop of group.properties) {
            if (prop.defaultValue !== undefined && !(prop.name in groupProps)) {
              groupProps[prop.name] = {
                value: prop.defaultValue,
                isFunction: false
              };
            }
          }
        }

        // Resolve initial values for all properties
        const initialValues = await Promise.all(
          Object.entries(groupProps).map(async ([key, propValue]) => {
            let value;
            if (propValue.isFunction) {
              const resolved = await resolveProperties({ [key]: propValue.value });
              value = resolved[key];
            } else {
              value = propValue.value;
            }
            return [key, value];
          })
        );

        // Update the group properties state with resolved values
        for (const [key, value] of initialValues) {
          groupProps[key].lastResolved = value;
        }

        // Update the group properties state
        groupProperties[groupName] = groupProps;

        // Call the group update callback with resolved values
        const resolvedValues = Object.fromEntries(initialValues);
        onGroupUpdated(group.name as T["groups"][G]["name"], resolvedValues as T["groups"][G]["properties"]);
      } catch (error) {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
    },

    getProperties: () => {
      // Return only the resolved values
      return Object.fromEntries(
        Object.entries(groupProperties).map(([groupName, props]) => [
          groupName,
          Object.fromEntries(
            Object.entries(props).map(([key, propValue]) => [
              key,
              propValue.isFunction ? propValue.lastResolved : propValue.value
            ])
          )
        ])
      ) as { [K in TrackerGroup<T>]: T["groups"][K]["properties"] };
    }
  };
}
