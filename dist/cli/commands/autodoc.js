"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAutodocCommand = registerAutodocCommand;
const express_1 = __importDefault(require("express"));
const opener_1 = __importDefault(require("opener"));
const validation_1 = require("../validation");
const autodocUtils_1 = require("../utils/autodocUtils");
function registerAutodocCommand(program) {
    program
        .command("autodoc")
        .description("Start a local server to view analytics documentation")
        .option("--output-html", "Output the generated HTML instead of starting a server")
        .action((options) => __awaiter(this, void 0, void 0, function* () {
        try {
            console.log("🔍 Running validation before generating documentation...");
            if (!(0, validation_1.validateAnalyticsFiles)()) {
                process.exit(1);
            }
            const autodocHtml = (0, autodocUtils_1.generateAutodocHtml)();
            if (options.outputHtml) {
                // Output the HTML directly
                console.log(autodocHtml);
                return;
            }
            // Start server mode
            const app = (0, express_1.default)();
            const port = 5555;
            // Serve static assets
            app.get("/", (req, res) => {
                res.send(autodocHtml);
            });
            // Start the server
            app.listen(port, () => {
                console.log("📚 Documentation server running at http://localhost:" + port);
                console.log("Press 'q' to quit");
                // Open the browser
                (0, opener_1.default)("http://localhost:" + port);
            });
            // Handle 'q' key press to quit
            process.stdin.setRawMode(true);
            process.stdin.resume();
            process.stdin.on('data', (key) => {
                if (key[0] === 113) { // 'q' key
                    console.log("\n👋 Shutting down documentation server...");
                    process.exit(0);
                }
            });
        }
        catch (error) {
            console.error("❌ Error:", error);
            process.exit(1);
        }
    }));
}
