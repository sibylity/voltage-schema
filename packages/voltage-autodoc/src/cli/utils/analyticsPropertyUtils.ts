import { readFileSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';

interface PropertyOptions {
  includeGroups?: boolean;
  verbose?: boolean;
}

export interface PropertyData {
  name: string;
  type: string;
  description?: string;
  source?: string;
  groupName?: string;
}

export function getAllProperties(options: PropertyOptions = {}): PropertyData[] {
  const properties: PropertyData[] = [];

  // Read events file
  const eventsPath = join(process.cwd(), 'analytics.events.json');
  const eventsContent = readFileSync(eventsPath, 'utf8');
  const events = yaml.load(eventsContent) as { events: Record<string, { properties: PropertyData[] }> };

  if (events && events.events) {
    Object.values(events.events).forEach(event => {
      if (event.properties) {
        properties.push(...event.properties.map(p => ({
          ...p,
          source: 'event'
        })));
      }
    });
  }

  // Read groups file if requested
  if (options.includeGroups) {
    const groupsPath = join(process.cwd(), 'analytics.all-groups.json');
    const groupsContent = readFileSync(groupsPath, 'utf8');
    const groups = yaml.load(groupsContent) as { groups: Array<{ name: string; properties: PropertyData[] }> };

    if (groups && groups.groups) {
      groups.groups.forEach(group => {
        if (group.properties) {
          properties.push(...group.properties.map(p => ({
            ...p,
            source: 'group',
            groupName: group.name
          })));
        }
      });
    }
  }

  return properties;
}

export function getPropertyByName(name: string, options: PropertyOptions = {}): PropertyData | null {
  const properties = getAllProperties(options);
  return properties.find(p => p.name === name) || null;
}
