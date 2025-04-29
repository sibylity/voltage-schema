// Schema Types (used by CLI)
export interface AnalyticsSchemaProperty {
  name: string;
  description: string;
  type: string | string[];
  optional?: boolean;
  value?: any;
}

export interface AnalyticsSchemaDimensionIdentifier {
  property: string;
  contains?: string;
  equals?: string | number | boolean;
  not?: string | number | boolean;
  in?: (string | number | boolean)[];
  notIn?: (string | number | boolean)[];
  startsWith?: string;
  endsWith?: string;
  lt?: number;
  lte?: number;
  gt?: number;
  gte?: number;
}

export interface AnalyticsSchemaDimension {
  name: string;
  description: string;
  identifiers: AnalyticsSchemaDimensionIdentifier[];
}

// Analytics Config Types
export interface AnalyticsConfig {
  generates: GenerationConfig[];
}

export interface GenerationConfig {
  events: string;
  dimensions?: string[];
  groups?: string[];
  output: string;
  disableComments?: boolean;
}

// Analytics Globals Types
export interface AnalyticsGlobals {
  groups: Group[];
  dimensions: Dimension[];
}

export interface Group {
  name: string;
  description: string;
  properties: Property[];
  passthrough?: boolean;
  identifiedBy?: string;
}

export interface Property {
  name: string;
  description: string;
  type: string | string[] | 'boolean' | 'number' | 'string' | 'string[]' | 'number[]' | 'boolean[]';
  optional?: boolean;
  value?: any;
}

export interface DimensionIdentifier {
  property: string;
  group: string;
  equals?: string | number | boolean;
  not?: string | number | boolean;
  contains?: string;
  in?: (string | number | boolean)[];
  notIn?: (string | number | boolean)[];
  startsWith?: string;
  endsWith?: string;
  lt?: number;
  lte?: number;
  gt?: number;
  gte?: number;
}

export interface Dimension {
  name: string;
  description: string;
  identifiers: {
    AND?: Array<DimensionIdentifier>;
    OR?: Array<DimensionIdentifier>;
  };
}

// Analytics Events Types
export interface AnalyticsEvents {
  events: Record<string, Event>;
}

export interface Event {
  name: string;
  description: string;
  dimensions?: string[] | {
    inclusive?: string[];
    exclusive?: string[];
  };
  properties?: Property[];
  passthrough?: boolean;
}

// Runtime Types
export interface TrackerEvents {
  events: {
    [K: string]: {
      name: string;
      properties: Record<string, any>;
      passthrough?: boolean;
    };
  };
  groups: {
    [K: string]: {
      name: string;
      properties: Record<string, any>;
      passthrough?: boolean;
      identifiedBy?: string;
    };
  };
}

export type TrackerEvent<T extends TrackerEvents> = keyof T["events"];
export type TrackerGroup<T extends TrackerEvents> = keyof T["groups"];

export type EventProperties<T extends TrackerEvents, E extends TrackerEvent<T>> = T["events"][E]["properties"];
export type GroupProperties<T extends TrackerEvents, G extends TrackerGroup<T>> = T["groups"][G]["properties"];

// Helper type to determine if an event has properties
export type HasProperties<T extends TrackerEvents, E extends TrackerEvent<T>> = EventProperties<T, E> extends Record<string, never> ? false : true;

export interface AnalyticsTracker<T extends TrackerEvents> {
  track: <E extends TrackerEvent<T>>(
    eventKey: E,
    ...args: HasProperties<T, E> extends true ? [eventProperties: EventProperties<T, E>] : []
  ) => void;
  setProperties: <G extends TrackerGroup<T>>(
    groupName: G,
    properties: T["groups"][G]["properties"]
  ) => void;
  getProperties: () => { [K in TrackerGroup<T>]: T["groups"][K]["properties"] };
}

export interface TrackerOptions<T extends TrackerEvents> {
  onEventTracked: (
    eventName: T["events"][TrackerEvent<T>]["name"],
    eventProperties: T["events"][TrackerEvent<T>]["properties"],
    groupProperties: { [K in TrackerGroup<T>]: T["groups"][K]["properties"] }
  ) => void;
  onGroupUpdated: (
    groupName: T["groups"][TrackerGroup<T>]["name"],
    properties: T["groups"][TrackerGroup<T>]["properties"]
  ) => void;
  onError?: (error: Error) => void;
}