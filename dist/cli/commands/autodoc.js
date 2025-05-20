"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAutodocCommand = registerAutodocCommand;
const validation_1 = require("../validation");
const autodocUtils_1 = require("../utils/autodocUtils");
function registerAutodocCommand(cli) {
    cli
        .command("autodoc", "Generate HTML documentation for your analytics schema")
        .option("--output-html", "Output HTML documentation")
        .action((options) => {
        try {
            console.log("🔍 Running validation before generating autodoc...");
            if (!(0, validation_1.validateAnalyticsFiles)()) {
                process.exit(1);
            }
            if (options["output-html"]) {
                const html = (0, autodocUtils_1.generateAutodocHtml)();
                console.log(html);
            }
            else {
                console.log("📚 Autodoc server functionality is coming soon. For now, please use the --output-html option to generate HTML documentation.");
            }
        }
        catch (error) {
            console.error("❌ Error generating autodoc:", error);
            process.exit(1);
        }
    });
}
