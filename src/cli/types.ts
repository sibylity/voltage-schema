export interface Command {
  name: string;
  description: string;
  option(name: string, description: string): Command;
  action(handler: (options: Record<string, boolean>, args: string[]) => void): Command;
  execute(options: Record<string, boolean>, args: string[]): void;
}
