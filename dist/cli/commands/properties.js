"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerPropertiesCommand = registerPropertiesCommand;
const validation_1 = require("../validation");
const analyticsPropertyUtils_1 = require("../utils/analyticsPropertyUtils");
function registerPropertiesCommand(program) {
    program
        .command("properties")
        .description("List all properties across groups and events")
        .option("--verbose", "Include all available information")
        .action((options) => {
        try {
            console.log("🔍 Running validation before listing properties...");
            if (!(0, validation_1.validateAnalyticsFiles)()) {
                process.exit(1);
            }
            const properties = (0, analyticsPropertyUtils_1.getAllProperties)({ verbose: options.verbose });
            console.log(JSON.stringify(properties, null, 2));
        }
        catch (error) {
            console.error("❌ Error processing properties:", error);
            process.exit(1);
        }
    });
}
