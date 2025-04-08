// Schema Types (used by CLI)
export interface AnalyticsSchemaProperty {
  name: string;
  description: string;
  type: string | string[];
  optional?: boolean;
}

export interface AnalyticsSchemaDimensionIdentifier {
  property: string;
  contains?: (string | number | boolean)[];
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

export interface AnalyticsSchemaGlobals {
  dimensions: AnalyticsSchemaDimension[];
}

export interface AnalyticsSchemaEvent {
  name: string;
  description: string;
  dimensions?: string[];
  properties?: AnalyticsSchemaProperty[];
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
}

export interface Dimension {
  name: string;
  description: string;
  identifiers: {
    AND?: DimensionIdentifier[];
    OR?: DimensionIdentifier[];
  };
}

export interface DimensionIdentifier {
  property: string;
  group: string;
  contains?: (string | number | boolean)[];
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

// Analytics Events Types
export interface AnalyticsEvents {
  events: Record<string, Event>;
}

export interface Event {
  name: string;
  description: string;
  dimensions?: string[];
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
  globals: {
    dimensions: {
      [K: string]: {
        name: string;
        description: string;
        identifiers: Array<{
          property: string;
          contains?: (string | number | boolean)[];
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
        }>;
      };
    };
  };
}

export type TrackerEvent<T extends TrackerEvents> = keyof T["events"];
export type TrackerGroup<T extends TrackerEvents> = keyof T["groups"];

export type EventProperties<T extends TrackerEvents, E extends TrackerEvent<T>> = T["events"][E]["properties"];
export type GroupProperties<T extends TrackerEvents, G extends TrackerGroup<T>> = T["groups"][G]["properties"];

// Helper type to make all properties optional except identifiedBy
type RequiredProperty<T extends TrackerEvents, G extends TrackerGroup<T>> = T["groups"][G]["identifiedBy"] extends string
  ? { [K in T["groups"][G]["identifiedBy"]]: T["groups"][G]["properties"][K] }
  : {};

type OptionalProperties<T extends TrackerEvents, G extends TrackerGroup<T>> = T["groups"][G]["identifiedBy"] extends string
  ? Omit<T["groups"][G]["properties"], T["groups"][G]["identifiedBy"]>
  : T["groups"][G]["properties"];

export interface AnalyticsTracker<T extends TrackerEvents> {
  track: <E extends TrackerEvent<T>>(
    eventKey: E,
    eventProperties: EventProperties<T, E>
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
  onGroupUpdate: (
    groupName: T["groups"][TrackerGroup<T>]["name"],
    properties: T["groups"][TrackerGroup<T>]["properties"]
  ) => void;
  onError?: (error: Error) => void;
}