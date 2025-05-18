import { readFileSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';

interface DimensionOptions {
  includeEventDetails?: boolean;
  verbose?: boolean;
}

export interface DimensionData {
  name: string;
  description: string;
  identifiers: any;
  events?: string[];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getAllDimensions(options: DimensionOptions = {}): DimensionData[] {
  const dimensionsPath = join(process.cwd(), 'analytics.all-dimensions.json');
  const dimensionsContent = readFileSync(dimensionsPath, 'utf8');
  const dimensions = yaml.load(dimensionsContent) as { dimensions: DimensionData[] };

  if (!dimensions || !dimensions.dimensions) {
    return [];
  }

  return dimensions.dimensions;
}

export function getDimensionByName(name: string, options: DimensionOptions = {}): DimensionData | null {
  const dimensions = getAllDimensions(options);
  return dimensions.find(d => d.name === name) || null;
}
