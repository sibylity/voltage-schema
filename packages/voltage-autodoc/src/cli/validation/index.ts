import { readFileSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';

export interface ValidationResult<T> {
  valid: boolean;
  data?: T;
  errors?: string[];
}

export function validateAnalyticsFiles(): ValidationResult<any> {
  try {
    // Validate events file
    const eventsPath = join(process.cwd(), 'analytics.events.json');
    const eventsContent = readFileSync(eventsPath, 'utf8');
    const events = yaml.load(eventsContent);

    // Validate groups file
    const groupsPath = join(process.cwd(), 'analytics.all-groups.json');
    const groupsContent = readFileSync(groupsPath, 'utf8');
    const groups = yaml.load(groupsContent);

    // Validate dimensions file
    const dimensionsPath = join(process.cwd(), 'analytics.all-dimensions.json');
    const dimensionsContent = readFileSync(dimensionsPath, 'utf8');
    const dimensions = yaml.load(dimensionsContent);

    return {
      valid: true,
      data: {
        events,
        groups,
        dimensions
      }
    };
  } catch (error) {
    return {
      valid: false,
      errors: [(error as Error).message]
    };
  }
}
