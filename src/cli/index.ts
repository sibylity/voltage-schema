import { CLI } from "./cli";
import { registerInitCommand } from "./commands/init";
import { registerValidateCommand } from "./commands/validate";
import { registerDimensionsCommand } from "./commands/dimensions";
import { registerPropertiesCommand } from "./commands/properties";
import { registerEventsCommand } from "./commands/events";
import { registerGenerateCommand } from "./commands/generate";
import { registerAutodocCommand } from "./commands/autodoc";

const cli = new CLI();

// Register all commands
registerInitCommand(cli);
registerValidateCommand(cli);
registerDimensionsCommand(cli);
registerPropertiesCommand(cli);
registerEventsCommand(cli);
registerGenerateCommand(cli);
registerAutodocCommand(cli);

// Parse command line arguments
cli.parse(process.argv);
