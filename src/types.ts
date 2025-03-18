// Schema Types (used by CLI)
export interface AnalyticsSchemaProperty {
  name: string;
  description: string;
  type: string | string[];
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
  dimensions: Dimension[];
  properties: Property[];
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

export interface Property {
  name: string;
  description: string;
  type: string | string[];
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
}

// Tracker Types
export interface EventData {
  eventKey: string;
  eventName: string;
  eventProperties: Record<string, any>;
}

// These types will be used by consuming applications
export interface TrackerEvents {
  [K: string]: {
    name: string;
    properties: Record<string, any>;
  };
}

export type TrackerEvent<T extends TrackerEvents> = keyof T & string;

export type EventProps<
  T extends TrackerEvents,
  E extends TrackerEvent<T>
> = T[E]['properties'];

export interface AnalyticsTracker<T extends TrackerEvents> {
  track<E extends TrackerEvent<T>>(
    event: E,
    properties: EventProps<T, E>
  ): void;
}