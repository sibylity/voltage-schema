import { Command } from './types';

export class CLI {
  private commands: Map<string, Command> = new Map();

  command(name: string, description: string): Command {
    const command = new CommandImpl(name, description);
    this.commands.set(name, command);
    return command;
  }

  parse(argv: string[]) {
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

    const options: Record<string, boolean> = {};
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

class CommandImpl implements Command {
  private actionHandler?: (options: Record<string, boolean>, args: string[]) => void;
  private options: { name: string; description: string }[] = [];

  constructor(
    public name: string,
    public description: string
  ) {}

  option(name: string, description: string): Command {
    this.options.push({ name, description });
    return this;
  }

  action(handler: (options: Record<string, boolean>, args: string[]) => void): Command {
    this.actionHandler = handler;
    return this;
  }

  execute(options: Record<string, boolean>, args: string[]) {
    if (this.actionHandler) {
      this.actionHandler(options, args);
    }
  }
}
