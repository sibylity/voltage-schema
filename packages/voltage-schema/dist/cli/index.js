"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cli_1 = require("./cli");
const init_1 = require("./commands/init");
const validate_1 = require("./commands/validate");
const dimensions_1 = require("./commands/dimensions");
const properties_1 = require("./commands/properties");
const events_1 = require("./commands/events");
const generate_1 = require("./commands/generate");
const cli = new cli_1.CLI();
// Register all commands
(0, init_1.registerInitCommand)(cli);
(0, validate_1.registerValidateCommand)(cli);
(0, dimensions_1.registerDimensionsCommand)(cli);
(0, properties_1.registerPropertiesCommand)(cli);
(0, events_1.registerEventsCommand)(cli);
(0, generate_1.registerGenerateCommand)(cli);
// Parse command line arguments
cli.parse(process.argv);
