import { CLI } from "../cli";
import { validateAnalyticsFiles } from "../validation";
import { getAllEvents } from "../utils/analyticsEventUtils";

export function registerEventsCommand(cli: CLI) {
  cli
    .command("events", "List all events with their properties and dimensions")
    .option("--include-groups", "Include properties from all groups")
    .option("--include-dimensions", "Include detailed dimension information")
    .option("--verbose", "Include all available information (equivalent to --include-groups --include-dimensions)")
    .action((options: Record<string, boolean>) => {
      try {
        console.log("🔍 Running validation before listing events...");
        if (!validateAnalyticsFiles()) {
          process.exit(1);
        }

        const events = getAllEvents({
          includeGroups: options["include-groups"],
          includeDimensions: options["include-dimensions"],
          verbose: options.verbose
        });
        console.log(JSON.stringify(events, null, 2));
      } catch (error) {
        console.error("❌ Error processing events:", error);
        process.exit(1);
      }
    });
}
