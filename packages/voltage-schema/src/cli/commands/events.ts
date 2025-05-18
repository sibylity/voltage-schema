import { Command } from "commander";
import { validateAnalyticsFiles } from "../validation";
import { getAllEvents } from "../utils/analyticsEventUtils";

export function registerEventsCommand(program: Command) {
  program
    .command("events")
    .description("List all events with their properties and dimensions")
    .option("--include-groups", "Include properties from all groups")
    .option("--include-dimensions", "Include detailed dimension information")
    .option("--verbose", "Include all available information (equivalent to --include-groups --include-dimensions)")
    .action((options) => {
      try {
        console.log("🔍 Running validation before listing events...");
        if (!validateAnalyticsFiles()) {
          process.exit(1);
        }

        const events = getAllEvents({
          includeGroups: options.includeGroups,
          includeDimensions: options.includeDimensions,
          verbose: options.verbose
        });
        console.log(JSON.stringify(events, null, 2));
      } catch (error) {
        console.error("❌ Error processing events:", error);
        process.exit(1);
      }
    });
} 