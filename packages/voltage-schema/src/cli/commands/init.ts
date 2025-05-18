import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';

export function init() {
  const configPath = join(process.cwd(), 'analytics.config.json');
  if (existsSync(configPath)) {
    console.error('analytics.config.json already exists');
    process.exit(1);
  }

  const defaultConfig = {
    version: '1.0.0',
    generates: [
      {
        events: './analytics.events.json',
        dimensions: ['./analytics.all-dimensions.json'],
        groups: ['./analytics.all-groups.json'],
        output: './__analytics_generated__/analytics.ts'
      }
    ]
  };

  writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
  console.log('Created analytics.config.json');

  // Create empty events file
  const eventsPath = join(process.cwd(), 'analytics.events.json');
  if (!existsSync(eventsPath)) {
    writeFileSync(eventsPath, JSON.stringify({ events: {} }, null, 2));
    console.log('Created analytics.events.json');
  }

  // Create empty dimensions file
  const dimensionsPath = join(process.cwd(), 'analytics.all-dimensions.json');
  if (!existsSync(dimensionsPath)) {
    writeFileSync(dimensionsPath, JSON.stringify({ dimensions: [] }, null, 2));
    console.log('Created analytics.all-dimensions.json');
  }

  // Create empty groups file
  const groupsPath = join(process.cwd(), 'analytics.all-groups.json');
  if (!existsSync(groupsPath)) {
    writeFileSync(groupsPath, JSON.stringify({ groups: [] }, null, 2));
    console.log('Created analytics.all-groups.json');
  }
}
