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
const analyticsEventUtils_1 = require("../utils/analyticsEventUtils");
function registerAutodocCommand(program) {
    program
        .command("autodoc")
        .description("Start a local server to view analytics documentation")
        .action(() => __awaiter(this, void 0, void 0, function* () {
        try {
            console.log("🔍 Running validation before starting documentation server...");
            if (!(0, validation_1.validateAnalyticsFiles)()) {
                process.exit(1);
            }
            const app = (0, express_1.default)();
            const port = 5555;
            // Basic HTML template for the documentation
            app.get("/", (req, res) => {
                let html = `
            <!DOCTYPE html>
            <html>
              <head>
                <title>Analytics Documentation</title>
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 20px; }
                  .event { margin-bottom: 20px; padding: 10px; border: 1px solid #ddd; }
                  .event-name { font-weight: bold; font-size: 1.2em; }
                  .property { margin-left: 20px; }
                </style>
              </head>
              <body>
                <h1>Analytics Events</h1>
          `;
                const events = (0, analyticsEventUtils_1.getAllEvents)({ verbose: true });
                events.forEach(event => {
                    html += `
              <div class="event">
                <div class="event-name">${event.name}</div>
                <div class="event-key">Key: ${event.key}</div>
                ${event.properties.length > 0 ? `
                  <div class="properties">
                    <h3>Properties:</h3>
                    ${event.properties.map(prop => `
                      <div class="property">
                        <strong>${prop.name}</strong> (${prop.type})
                        ${prop.description ? `<br>${prop.description}` : ''}
                        ${prop.source === 'group' ? '<br><em>From group</em>' : ''}
                      </div>
                    `).join('')}
                  </div>
                ` : ''}
                ${event.dimensions ? `
                  <div class="dimensions">
                    <h3>Dimensions:</h3>
                    ${event.dimensions.map(dim => `
                      <div class="dimension">
                        <strong>${dim.name}</strong>
                        ${dim.description ? `<br>${dim.description}` : ''}
                      </div>
                    `).join('')}
                  </div>
                ` : ''}
              </div>
            `;
                });
                html += `
              </body>
            </html>
          `;
                res.send(html);
            });
            // Start the server
            app.listen(port, () => {
                console.log(`📚 Documentation server running at http://localhost:${port}`);
                console.log("Press 'q' to quit");
                // Open the browser
                (0, opener_1.default)(`http://localhost:${port}`);
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
            console.error("❌ Error starting documentation server:", error);
            process.exit(1);
        }
    }));
}
