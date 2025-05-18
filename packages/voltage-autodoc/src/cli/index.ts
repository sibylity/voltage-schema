#!/usr/bin/env node

import { readFileSync } from 'fs';
import { join } from 'path';
import express from 'express';
import { validateAnalyticsFiles } from './validation';
import { generateAutodocHtml } from './utils/autodocUtils';

const VERSION = '1.5.0';

function showHelp() {
  console.log(`
Usage: voltage-autodoc [options] [command]

Generate documentation for your analytics events, properties, and dimensions.

Options:
  -V, --version   output the version number
  -h, --help      display help for command

Commands:
  dimensions [options]  List all dimensions
  properties [options]  List all properties
  events [options]      List all events
  autodoc [options]     Start a local server to view the documentation
  help [command]        display help for command
  `);
}

function showCommandHelp(command: string) {
  switch (command) {
    case 'dimensions':
      console.log(`
Usage: voltage-autodoc dimensions [options]

List all dimensions

Options:
  -h, --help     display help for command
  -v, --verbose  show detailed information
      `);
      break;
    case 'properties':
      console.log(`
Usage: voltage-autodoc properties [options]

List all properties

Options:
  -h, --help     display help for command
  -v, --verbose  show detailed information
      `);
      break;
    case 'events':
      console.log(`
Usage: voltage-autodoc events [options]

List all events

Options:
  -h, --help     display help for command
  -v, --verbose  show detailed information
      `);
      break;
    case 'autodoc':
      console.log(`
Usage: voltage-autodoc autodoc [options]

Start a local server to view the documentation

Options:
  -h, --help     display help for command
  -p, --port     port to run the server on (default: 3000)
      `);
      break;
    default:
      console.log(`Unknown command: ${command}`);
      showHelp();
  }
}

function listDimensions(verbose = false) {
  const result = validateAnalyticsFiles();
  if (!result.valid) {
    console.error('Validation failed:', result.errors);
    process.exit(1);
  }

  const dimensionsPath = join(process.cwd(), 'analytics.all-dimensions.json');
  const dimensions = JSON.parse(readFileSync(dimensionsPath, 'utf8')).dimensions;

  console.log('\nDimensions:');
  dimensions.forEach((dimension: any) => {
    console.log(`\n${dimension.name}`);
    if (verbose) {
      console.log(`Description: ${dimension.description}`);
      console.log('Identifiers:');
      if (dimension.identifiers.OR) {
        console.log('  OR:');
        dimension.identifiers.OR.forEach((id: any) => {
          console.log(`    - ${id.property} (${id.group})`);
        });
      }
      if (dimension.identifiers.AND) {
        console.log('  AND:');
        dimension.identifiers.AND.forEach((id: any) => {
          console.log(`    - ${id.property} (${id.group})`);
        });
      }
    }
  });
}

function listProperties(verbose = false) {
  const result = validateAnalyticsFiles();
  if (!result.valid) {
    console.error('Validation failed:', result.errors);
    process.exit(1);
  }

  const groupsPath = join(process.cwd(), 'analytics.all-groups.json');
  const groups = JSON.parse(readFileSync(groupsPath, 'utf8')).groups;

  console.log('\nProperties:');
  groups.forEach((group: any) => {
    console.log(`\n${group.name}`);
    if (verbose) {
      console.log(`Description: ${group.description}`);
      console.log('Properties:');
      group.properties.forEach((prop: any) => {
        console.log(`  - ${prop.name}: ${prop.type}`);
      });
    }
  });
}

function listEvents(verbose = false) {
  const result = validateAnalyticsFiles();
  if (!result.valid) {
    console.error('Validation failed:', result.errors);
    process.exit(1);
  }

  const eventsPath = join(process.cwd(), 'analytics.events.json');
  const events = JSON.parse(readFileSync(eventsPath, 'utf8')).events;

  console.log('\nEvents:');
  Object.entries(events).forEach(([name, event]: [string, any]) => {
    console.log(`\n${name}`);
    if (verbose) {
      console.log(`Description: ${event.description}`);
      console.log('Properties:');
      event.properties.forEach((prop: any) => {
        console.log(`  - ${prop.name}: ${prop.type}`);
      });
      if (event.dimensions && event.dimensions.length > 0) {
        console.log('Dimensions:');
        event.dimensions.forEach((dim: string) => {
          console.log(`  - ${dim}`);
        });
      }
    }
  });
}

function startAutodocServer(port = 3000) {
  const app = express();
  const result = validateAnalyticsFiles();
  if (!result.valid) {
    console.error('Validation failed:', result.errors);
    process.exit(1);
  }

  app.get('/', (req, res) => {
    const html = generateAutodocHtml();
    res.send(html);
  });

  app.listen(port, () => {
    console.log(`Documentation server running at http://localhost:${port}`);
  });
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  let port = 3000;
  const portArg = args.find(arg => arg.startsWith('-p=') || arg.startsWith('--port='));

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
    case 'dimensions':
      listDimensions(args.includes('-v') || args.includes('--verbose'));
      break;
    case 'properties':
      listProperties(args.includes('-v') || args.includes('--verbose'));
      break;
    case 'events':
      listEvents(args.includes('-v') || args.includes('--verbose'));
      break;
    case 'autodoc':
      if (portArg) {
        port = parseInt(portArg.split('=')[1]);
      }
      startAutodocServer(port);
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
