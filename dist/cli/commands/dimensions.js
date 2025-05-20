"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDimensionsCommand = registerDimensionsCommand;
const validation_1 = require("../validation");
const analyticsDimensionUtils_1 = require("../utils/analyticsDimensionUtils");
function registerDimensionsCommand(cli) {
    cli
        .command("dimensions", "List all events grouped by dimension")
        .option("--include-event-details", "Include event names and descriptions in the output")
        .option("--verbose", "Include all available information")
        .action((options) => {
        try {
            console.log("🔍 Running validation before listing dimensions...");
            if (!(0, validation_1.validateAnalyticsFiles)()) {
                process.exit(1);
            }
            const dimensions = (0, analyticsDimensionUtils_1.getAllDimensions)({
                includeEventDetails: options["include-event-details"],
                verbose: options.verbose
            });
            console.log(JSON.stringify(dimensions, null, 2));
        }
        catch (error) {
            console.error("❌ Error listing dimensions:", error instanceof Error ? error.message : String(error));
            process.exit(1);
        }
    });
}
