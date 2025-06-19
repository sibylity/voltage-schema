"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLI = void 0;
class CLI {
    constructor() {
        this.commands = new Map();
    }
    command(name, description) {
        const command = new CommandImpl(name, description);
        this.commands.set(name, command);
        return command;
    }
    parse(argv) {
        const args = argv.slice(2); // Remove 'node' and script name
        const commandName = args[0];
        const command = this.commands.get(commandName);
        if (!command) {
            console.error(`Unknown command: ${commandName}`);
            console.log('Available commands:');
            this.commands.forEach((cmd, name) => {
                console.log(`  ${name} - ${cmd.description}`);
            });
            process.exit(1);
        }
        const options = {};
        const remainingArgs = args.slice(1).filter(arg => {
            if (arg.startsWith('--')) {
                const optionName = arg.slice(2);
                options[optionName] = true;
                return false;
            }
            return true;
        });
        command.execute(options, remainingArgs);
    }
}
exports.CLI = CLI;
class CommandImpl {
    constructor(name, description) {
        this.name = name;
        this.description = description;
        this.options = [];
    }
    option(name, description) {
        this.options.push({ name, description });
        return this;
    }
    action(handler) {
        this.actionHandler = handler;
        return this;
    }
    execute(options, args) {
        if (this.actionHandler) {
            this.actionHandler(options, args);
        }
    }
}
