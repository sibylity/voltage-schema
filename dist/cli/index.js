"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const init_1 = require("./commands/init");
const validate_1 = require("./commands/validate");
const dimensions_1 = require("./commands/dimensions");
const properties_1 = require("./commands/properties");
const events_1 = require("./commands/events");
const generate_1 = require("./commands/generate");
const autodoc_1 = require("./commands/autodoc");
// Register all commands
(0, init_1.registerInitCommand)(commander_1.program);
(0, validate_1.registerValidateCommand)(commander_1.program);
(0, dimensions_1.registerDimensionsCommand)(commander_1.program);
(0, properties_1.registerPropertiesCommand)(commander_1.program);
(0, events_1.registerEventsCommand)(commander_1.program);
(0, generate_1.registerGenerateCommand)(commander_1.program);
(0, autodoc_1.registerAutodocCommand)(commander_1.program);
// Parse command line arguments
commander_1.program.parse(process.argv);
