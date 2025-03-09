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