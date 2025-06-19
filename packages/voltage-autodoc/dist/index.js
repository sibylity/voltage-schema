#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = require("./command");
const command = new command_1.Command();
// Parse command line arguments and execute
command.parse(process.argv);
//# sourceMappingURL=index.js.map