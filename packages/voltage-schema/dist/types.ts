// Schema Types (used by CLI)
export interface AnalyticsSchemaProperty {
  name: string;
  description: string;
  type: string | string[];
  optional?: boolean;
  defaultValue?: string | number | boolean;
}

export interface AnalyticsSchemaMetaRule {
  name: string;
  description: string;
  type: string | string[];
  optional?: boolean;
  defaultValue?: string | number | boolean;
  private?: boolean;
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
  groups?: string[];
  dimensions?: string[];
  meta?: string;
  output: string;
  disableComments?: boolean;
  eventKeyPropertyName?: string;
  // Single-file options
  mergedSchemaFile?: string;
  mergedSchemaOutput?: string;
}

// Analytics Globals Types
export interface AnalyticsGlobals {
  groups: Group[];
  dimensions: Dimension[];
  meta?: AnalyticsSchemaMetaRule[];
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
  defaultValue?: string | number | boolean;
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
    included?: string[];
    excluded?: string[];
  };
  properties?: Property[];
  meta?: Record<string, string | number | boolean>;
  passthrough?: boolean;
}

// Runtime Types
export interface AnalyticsSchema {
  events: {
    [K: string]: {
      name: string;
      properties: Record<string, any>;
      meta: Record<string, any>;
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

export type TrackerEvent<T extends AnalyticsSchema> = keyof T["events"];
export type TrackerGroup<T extends AnalyticsSchema> = keyof T["groups"];

export type EventProperties<T extends AnalyticsSchema, E extends TrackerEvent<T>> = T["events"][E]["properties"];
export type EventMeta<T extends AnalyticsSchema, E extends TrackerEvent<T>> = T["events"][E]["meta"];
export type GroupProperties<T extends AnalyticsSchema, G extends TrackerGroup<T>> = T["groups"][G]["properties"];

// Helper type to determine if an event has properties
export type HasProperties<T extends AnalyticsSchema, E extends TrackerEvent<T>> = EventProperties<T, E> extends Record<string, never> ? false : true;

export interface AnalyticsTracker<T extends AnalyticsSchema> {
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

export interface TrackerOptions<T extends AnalyticsSchema> {
  onEventTracked: <E extends TrackerEvent<T>>(
    eventName: T["events"][E]["name"],
    eventData: {
      properties: { [K in keyof T["events"][E]["properties"]]: T["events"][E]["properties"][K] };
      meta: T["events"][E]["meta"];
      groups: { [K in TrackerGroup<T>]: T["groups"][K]["properties"] };
    }
  ) => void | Promise<void>;
  onGroupUpdated: <G extends TrackerGroup<T>>(
    groupName: T["groups"][G]["name"],
    properties: T["groups"][G]["properties"]
  ) => void | Promise<void>;
  onError?: (error: Error) => void;
}
