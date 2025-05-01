export interface Property {
  name: string;
  type: string;
  description?: string;
  source: 'event' | 'group';
  groupName?: string;
  defaultValue?: string | number | boolean;
}

export interface Dimension {
  name: string;
  description?: string;
  events: string[];
  identifiers: Array<{
    property: string;
    [key: string]: any;
  }>;
  eventDetails?: Array<{
    name: string;
    key: string;
    description?: string;
  }>;
}

export interface Contributor {
  name: string;
}

export interface AnalyticsEvent {
  name: string;
  key: string;
  description?: string;
  dimensions?: Dimension[];
  properties: Property[];
  contributors?: Contributor[];
  updated?: string;
}

export interface PropertySource {
  type: "event" | "group";
  name: string;
  description?: string;
  optional?: boolean;
}

export interface AnalyticsProperty {
  property: string;
  types: (string | string[])[];
  sources: PropertySource[];
}

export interface AnalyticsDimension {
  dimension: string;
  description: string;
  events: string[];
  identifiers: Array<{
    property: string;
    [key: string]: any;
  }>;
  eventDetails?: Array<{
    name: string;
    key: string;
    description?: string;
  }>;
}

export interface AnalyticsConfig {
  generates: Array<{
    events: string;
    globals: string;
    output: string;
  }>;
} 