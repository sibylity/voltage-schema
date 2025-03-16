"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const init_1 = require("./commands/init");
const validate_1 = require("./commands/validate");
const dimensions_1 = require("./commands/dimensions");
const generate_1 = require("./commands/generate");
// Register all commands
(0, init_1.registerInitCommand)(commander_1.program);
(0, validate_1.registerValidateCommand)(commander_1.program);
(0, dimensions_1.registerDimensionsCommand)(commander_1.program);
(0, generate_1.registerGenerateCommand)(commander_1.program);
// Parse command line arguments
commander_1.program.parse(process.argv);
