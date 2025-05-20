import { CLI } from "../cli";
import { validateAnalyticsFiles } from "../validation";

export function registerValidateCommand(cli: CLI) {
  cli
    .command("validate", "Validate the analytics configuration files and check event structure")
    .action((options: Record<string, boolean>) => {
      validateAnalyticsFiles();
    });
}
