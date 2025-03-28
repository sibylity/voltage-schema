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
  properties: AnalyticsSchemaProperty[];
}

export interface AnalyticsSchemaEvent {
  name: string;
  description: string;
  version?: string;
  dimensions?: string[];
  properties?: AnalyticsSchemaProperty[];
}

export interface AnalyticsSchema {
  version: string;
  generatedDir: string;
  globals: AnalyticsSchemaGlobals;
  events: Record<string, AnalyticsSchemaEvent>;
}

// Analytics Config Types
export interface AnalyticsConfig {
  version: string;
  generates: GenerationConfig[];
}

export interface GenerationConfig {
  events: string;
  globals: string;
  output: string;
  disableComments?: boolean;
}

// Analytics Globals Types
export interface AnalyticsGlobals {
  groups: Group[];
  properties: Property[];
  dimensions: Dimension[];
}

export interface Group {
  name: string;
  description: string;
  properties: Property[];
  passthrough?: boolean;
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
  identifiers: DimensionIdentifier[];
}

export interface DimensionIdentifier {
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

// Analytics Events Types
export interface AnalyticsEvents {
  events: Record<string, Event>;
}

export interface Event {
  name: string;
  description: string;
  version?: string;
  dimensions?: string[];
  properties?: Property[];
  passthrough?: boolean;
}

export interface TrackerOptions<T extends TrackerEvents> {
  trackEvent: (
    eventName: TrackerEvent<T>,
    eventProperties: EventProperties<T, TrackerEvent<T>>,
    globalProperties: GlobalProperties<T>,
    groupProperties: Record<TrackerGroup<T>, GroupProperties<T, TrackerGroup<T>>>
  ) => Promise<void>;
  groupIdentify: (
    groupName: TrackerGroup<T>,
    groupIdentifier: string | number,
    properties: GroupProperties<T, TrackerGroup<T>>
  ) => Promise<void>;
  onError?: (error: Error) => void;
}

// These types will be used by consuming applications
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
    };
  };
  globals: {
    properties: {
      [K: string]: {
        name: string;
        type: string | string[] | 'boolean' | 'number' | 'string' | 'string[]' | 'number[]' | 'boolean[]';
        optional?: boolean;
      };
    };
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

export type TrackerEvent<T extends TrackerEvents> = keyof T['events'] & string;

export type TrackerGroup<T extends TrackerEvents> = keyof T['groups'] & string;

export type EventProperties<
  T extends TrackerEvents,
  E extends TrackerEvent<T>
> = T['events'][E]['properties'];

export type GroupProperties<
  T extends TrackerEvents,
  G extends TrackerGroup<T>
> = T['groups'][G]['properties'];

export type GlobalProperties<T extends TrackerEvents> = {
  [K in keyof T['globals']['properties']]: T['globals']['properties'][K]['type'] extends 'boolean' ? boolean :
    T['globals']['properties'][K]['type'] extends 'number' ? number :
    T['globals']['properties'][K]['type'] extends 'string' ? string :
    T['globals']['properties'][K]['type'] extends 'string[]' ? string[] :
    T['globals']['properties'][K]['type'] extends 'number[]' ? number[] :
    T['globals']['properties'][K]['type'] extends 'boolean[]' ? boolean[] :
    any;
};

export interface AnalyticsTracker<T extends TrackerEvents> {
  track<E extends TrackerEvent<T>>(
    event: E,
    properties: EventProperties<T, E>
  ): void;
  group<G extends TrackerGroup<T>>(
    groupName: G,
    groupIdentifier: string | number,
    properties: GroupProperties<T, G>
  ): void;
  setProperties(properties: Partial<{
    [K in keyof GlobalProperties<T>]: GlobalProperties<T>[K] | (() => GlobalProperties<T>[K]);
  }>): void;
  getProperties(): GlobalProperties<T>;
  getGroups(): Record<TrackerGroup<T>, GroupProperties<T, TrackerGroup<T>>>;
}