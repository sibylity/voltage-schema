import type { Group } from './types';

function generateGroupType(group: Group): string {
  const properties = group.properties.map(prop => {
    const isRequired = group.identifiedBy === prop.name;
    return `  ${prop.name}${isRequired ? '' : '?'}: ${prop.type};`;
  }).join('\n');

  return `{
${properties}
}`;
}

function generateSingleGroupPropertiesType(group: Group): string {
  const properties = group.properties.map(prop => {
    const isRequired = group.identifiedBy === prop.name;
    return `  ${prop.name}${isRequired ? '' : '?'}: ${prop.type};`;
  }).join('\n');

  return `{
${properties}
}`;
}

function generateTrackerGroupType(groups: Group[]): string {
  return groups.map(group => `"${group.name}"`).join(' | ');
}

function generateGroupPropertiesType(groups: Group[]): string {
  return groups.map(group => {
    const properties = group.properties.map(prop => {
      const isRequired = group.identifiedBy === prop.name;
      return `  ${prop.name}${isRequired ? '' : '?'}: ${prop.type};`;
    }).join('\n');
    return `"${group.name}": {
${properties}
}`;
  }).join(' | ');
}

function generateAnalyticsTrackerInterface(): string {
  return `export interface AnalyticsTracker<T extends TrackerEvents> {
  track: <E extends TrackerEvent<T>>(
    eventKey: E,
    eventProperties: EventProperties<T, E>
  ) => void;
  setProperties: <G extends TrackerGroup<T>>(
    groupName: G,
    properties: T["groups"][G]["identifiedBy"] extends string
      ? { [K in T["groups"][G]["identifiedBy"]]: T["groups"][G]["properties"][K] } & Partial<Omit<T["groups"][G]["properties"], T["groups"][G]["identifiedBy"]>>
      : Partial<T["groups"][G]["properties"]>
  ) => void;
  getProperties: () => Record<TrackerGroup<T>, GroupProperties<T, TrackerGroup<T>>>;
}`;
} 