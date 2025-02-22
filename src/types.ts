export interface AnalyticsSchemaProperty {
  name: string;
  description: string;
  type: string | string[];
}

export interface AnalyticsSchema {
  version: string;
  validDimensions: string[];
  globalProperties: AnalyticsSchemaProperty[];
  events: {
    name: string;
    description: string;
    version?: string;
    dimensions?: string[];
    properties?: AnalyticsSchemaProperty[];
  }[];
}

export interface AnalyticsTracker {
  track: (eventKey: string, properties: Record<string, any>) => void;
}
