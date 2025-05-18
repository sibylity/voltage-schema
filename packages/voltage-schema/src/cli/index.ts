#!/usr/bin/env node

import { Command } from 'commander';
import { registerInitCommand } from './commands/init';
import { registerGenerateCommand } from './commands/generate';
import { registerValidateCommand } from './commands/validate';

const program = new Command();

program
  .name('voltage-schema')
  .description('The analytics schema that evolves with your software.')
  .version('1.5.0');

registerInitCommand(program);
registerGenerateCommand(program);
registerValidateCommand(program);

program.parse();
