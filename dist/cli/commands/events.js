"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerEventsCommand = registerEventsCommand;
const validation_1 = require("../validation");
const analyticsEventUtils_1 = require("../utils/analyticsEventUtils");
function registerEventsCommand(cli) {
    cli
        .command("events", "List all events with their properties and dimensions")
        .option("--include-groups", "Include properties from all groups")
        .option("--include-dimensions", "Include detailed dimension information")
        .option("--verbose", "Include all available information (equivalent to --include-groups --include-dimensions)")
        .action((options) => {
        try {
            console.log("🔍 Running validation before listing events...");
            if (!(0, validation_1.validateAnalyticsFiles)()) {
                process.exit(1);
            }
            const events = (0, analyticsEventUtils_1.getAllEvents)({
                includeGroups: options["include-groups"],
                includeDimensions: options["include-dimensions"],
                verbose: options.verbose
            });
            console.log(JSON.stringify(events, null, 2));
        }
        catch (error) {
            console.error("❌ Error processing events:", error);
            process.exit(1);
        }
    });
}
