#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { validateAnalyticsFiles } from './validation';
import { runGenerate } from './commands/generate';

const VERSION = '1.5.0';

function showHelp() {
  console.log(`
Usage: voltage-schema [options] [command]

The analytics schema that evolves with your software.

Options:
  -V, --version   output the version number
  -h, --help      display help for command

Commands:
  init [options]  Create default analytics configuration files
  generate        Generate TypeScript types & tracking config from your codegen config
  validate        Validate the analytics configuration files and check event structure
  help [command]  display help for command
  `);
}

function showCommandHelp(command: string) {
  switch (command) {
    case 'init':
      console.log(`
Usage: voltage-schema init [options]

Create default analytics configuration files

Options:
  -h, --help     display help for command
      `);
      break;
    case 'generate':
      console.log(`
Usage: voltage-schema generate

Generate TypeScript types & tracking config from your codegen config
      `);
      break;
    case 'validate':
      console.log(`
Usage: voltage-schema validate

Validate the analytics configuration files and check event structure
      `);
      break;
    default:
      console.log(`Unknown command: ${command}`);
      showHelp();
  }
}

function init() {
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

function generate() {
  const configPath = join(process.cwd(), 'analytics.config.json');
  if (!existsSync(configPath)) {
    console.error('analytics.config.json not found. Run "voltage-schema init" first.');
    process.exit(1);
  }

  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  const isValid = validateAnalyticsFiles();
  if (!isValid) {
    console.error('Validation failed');
    process.exit(1);
  }

  runGenerate(config.generates);
}

function validate() {
  const isValid = validateAnalyticsFiles();
  if (!isValid) {
    console.error('Validation failed');
    process.exit(1);
  }
  console.log('Validation passed!');
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (args.includes('-h') || args.includes('--help')) {
    if (command) {
      showCommandHelp(command);
    } else {
      showHelp();
    }
    return;
  }

  if (args.includes('-V') || args.includes('--version')) {
    console.log(VERSION);
    return;
  }

  switch (command) {
    case 'init':
      init();
      break;
    case 'generate':
      generate();
      break;
    case 'validate':
      validate();
      break;
    case 'help':
      showCommandHelp(args[1]);
      break;
    default:
      if (command) {
        console.error(`Unknown command: ${command}`);
      }
      showHelp();
      process.exit(1);
  }
}

main();
