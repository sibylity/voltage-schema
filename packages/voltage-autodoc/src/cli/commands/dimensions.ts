import { Command } from "commander";
import { getAllDimensions } from "../utils/analyticsDimensionUtils";

export function registerDimensionsCommand(program: Command) {
  program
    .command("dimensions")
    .description("List all events grouped by dimension")
    .option("--include-event-details", "Include event names and descriptions in the output")
    .option("--verbose", "Include all available information")
    .action((options) => {
      try {
        const dimensions = getAllDimensions({
          includeEventDetails: options.includeEventDetails,
          verbose: options.verbose
        });
        console.log(JSON.stringify(dimensions, null, 2));
      } catch (error) {
        console.error("❌ Error listing dimensions:", error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}
