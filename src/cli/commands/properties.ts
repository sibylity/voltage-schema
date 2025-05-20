import { CLI } from "../cli";
import { validateAnalyticsFiles } from "../validation";
import { getAllProperties } from "../utils/analyticsPropertyUtils";

export function registerPropertiesCommand(cli: CLI) {
  cli
    .command("properties", "List all properties across groups and events")
    .option("--verbose", "Include all available information")
    .action((options: Record<string, boolean>) => {
      try {
        console.log("🔍 Running validation before listing properties...");
        if (!validateAnalyticsFiles()) {
          process.exit(1);
        }

        const properties = getAllProperties({ verbose: options.verbose });
        console.log(JSON.stringify(properties, null, 2));
      } catch (error) {
        console.error("❌ Error processing properties:", error);
        process.exit(1);
      }
    });
}
