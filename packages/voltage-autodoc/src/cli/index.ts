#!/usr/bin/env node

import { Command } from 'commander';
import { registerEventsCommand } from './commands/events';
import { registerPropertiesCommand } from './commands/properties';
import { registerDimensionsCommand } from './commands/dimensions';
import { registerAutodocCommand } from './commands/autodoc';
import { execSync } from "child_process";

const program = new Command();

program
  .name('voltage-autodoc')
  .description('A documentation and visualization tool for voltage-schema analytics.')
  .version('1.0.0');

// Register all commands
registerDimensionsCommand(program);
registerPropertiesCommand(program);
registerEventsCommand(program);
registerAutodocCommand(program);

// Add a pre-action hook to validate schema before running any command
program.hook('preAction', () => {
  try {
    // Run voltage-schema validate command
    execSync('voltage validate', { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Schema validation failed. Please fix the errors before running this command.');
    process.exit(1);
  }
});

program.parse();
