import fs from 'fs';
import path from 'path';
import { type AnalyticsEvents, type AnalyticsGlobals, type GenerationConfig } from '../../types';
import { parseSchemaFile } from '../validation/fileValidation';

export function readGenerationConfigFiles(genConfig: GenerationConfig): {
  events: AnalyticsEvents;
  globals: AnalyticsGlobals;
} {
  // Read events file
  const events = parseSchemaFile<AnalyticsEvents>(genConfig.events);
  if (!events.isValid || !events.data) {
    throw new Error(`Failed to parse events file: ${genConfig.events}`);
  }

  // Read groups files
  const groups: any[] = [];
  if (genConfig.groups) {
    for (const groupFile of genConfig.groups) {
      const groupResult = parseSchemaFile(groupFile);
      if (!groupResult.isValid || !groupResult.data) {
        throw new Error(`Failed to parse groups file: ${groupFile}`);
      }
      groups.push(...(groupResult.data as { groups: any[] }).groups);
    }
  }

  // Read dimensions files
  const dimensions: any[] = [];
  if (genConfig.dimensions) {
    for (const dimensionFile of genConfig.dimensions) {
      const dimensionResult = parseSchemaFile(dimensionFile);
      if (!dimensionResult.isValid || !dimensionResult.data) {
        throw new Error(`Failed to parse dimensions file: ${dimensionFile}`);
      }
      dimensions.push(...(dimensionResult.data as { dimensions: any[] }).dimensions);
    }
  }

  // Read meta file
  let meta: any[] = [];
  if (genConfig.meta) {
    const metaResult = parseSchemaFile(genConfig.meta);
    if (!metaResult.isValid || !metaResult.data) {
      throw new Error(`Failed to parse meta file: ${genConfig.meta}`);
    }
    meta = (metaResult.data as { meta: any[] }).meta;
  }

  return {
    events: events.data,
    globals: {
      groups,
      dimensions,
      meta
    }
  };
}
