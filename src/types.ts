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
  globals: AnalyticsSchemaGlobals; // Moved validDimensions & globalProperties under "globals"
  events: Record<string, AnalyticsSchemaEvent>;
}

export interface AnalyticsTracker {
  track: (eventKey: string, properties: Record<string, any>) => void;
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
  disableComments?: boolean;  // Optional, defaults to false
}

// Analytics Globals Types
export interface AnalyticsGlobals {
  dimensions: Dimension[];
  properties: Property[];
}

export interface Dimension {
  name: string;
  description?: string;
  identifiers: Identifier[];
}

export interface Identifier {
  property: string;
  contains?: (string | number | boolean)[];
  equals?: string | number | boolean;
  not?: string | number | boolean;
  in?: (string | number | boolean)[];
  notIn?: (string | number | boolean)[];
  startsWith?: (string | number | boolean)[];
  endsWith?: (string | number | boolean)[];
  lt?: number;
  lte?: number;
  gt?: number;
  gte?: number;
}

export interface Property {
  name: string;
  description?: string;
  type: string | string[];
}

// Analytics Events Types
export interface AnalyticsEvents {
  events: Record<string, Event>;
}

export interface Event {
  name: string;
  description?: string;
  dimensions?: string[];
  properties?: Property[];
}