import { CLI } from "../cli";
import { validateAnalyticsFiles } from "../validation";
import { getAllDimensions } from "../utils/analyticsDimensionUtils";

export function registerDimensionsCommand(cli: CLI) {
  cli
    .command("dimensions", "List all events grouped by dimension")
    .option("--include-event-details", "Include event names and descriptions in the output")
    .option("--verbose", "Include all available information")
    .action((options: Record<string, boolean>) => {
      try {
        console.log("🔍 Running validation before listing dimensions...");
        if (!validateAnalyticsFiles()) {
          process.exit(1);
        }

        const dimensions = getAllDimensions({
          includeEventDetails: options["include-event-details"],
          verbose: options.verbose
        });
        console.log(JSON.stringify(dimensions, null, 2));
      } catch (error) {
        console.error("❌ Error listing dimensions:", error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}
