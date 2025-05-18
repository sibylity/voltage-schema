import { readFileSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';

interface EventOptions {
  includeGroups?: boolean;
  includeDimensions?: boolean;
  verbose?: boolean;
}

export interface EventData {
  name: string;
  description?: string;
  properties: Array<{
    name: string;
    type: string;
    description?: string;
  }>;
  groups?: string[];
  dimensions?: string[];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getAllEvents(options: EventOptions = {}): EventData[] {
  const eventsPath = join(process.cwd(), 'analytics.events.json');
  const eventsContent = readFileSync(eventsPath, 'utf8');
  const events = yaml.load(eventsContent) as { events: Record<string, EventData> };

  if (!events || !events.events) {
    return [];
  }

  return Object.entries(events.events).map(([key, event]) => ({
    ...event,
    name: event.name || key
  }));
}

export function getEventByName(name: string, options: EventOptions = {}): EventData | null {
  const events = getAllEvents(options);
  return events.find(e => e.name === name) || null;
}
