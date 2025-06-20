#!/usr/bin/env node

import { Command } from "./command";

const command = new Command();

// Parse command line arguments and execute
command.parse(process.argv);
