"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAutodocCommand = registerAutodocCommand;
const express_1 = __importDefault(require("express"));
const opener_1 = __importDefault(require("opener"));
const validation_1 = require("../validation");
const autodocUtils_1 = require("../utils/autodocUtils");
function registerAutodocCommand(cli) {
    cli
        .command("autodoc", "Open the autodoc in your browser, or output it's HTML for CI")
        .option("--output-html", "Output HTML instead of starting server")
        .action((options) => {
        try {
            console.log("🔍 Running validation before generating autodoc...");
            if (!(0, validation_1.validateAnalyticsFiles)()) {
                process.exit(1);
            }
            const html = (0, autodocUtils_1.generateAutodocHtml)();
            if (options["output-html"]) {
                console.log(html);
            }
            else {
                const app = (0, express_1.default)();
                const port = 3000;
                app.get("/", (req, res) => {
                    res.send(html);
                });
                app.listen(port, () => {
                    console.log(`📚 Autodoc server running at http://localhost:${port}`);
                    (0, opener_1.default)(`http://localhost:${port}`);
                });
            }
        }
        catch (error) {
            console.error("❌ Error generating autodoc:", error);
            process.exit(1);
        }
    });
}
