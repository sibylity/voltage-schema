import { Command } from "commander";
import express, { Request, Response } from "express";
import opener from "opener";
import { validateAnalyticsFiles } from "../validation";
import { getAllEvents } from "../utils/analyticsEventUtils";

export function registerAutodocCommand(program: Command) {
  program
    .command("autodoc")
    .description("Start a local server to view analytics documentation")
    .action(async () => {
      try {
        console.log("🔍 Running validation before starting documentation server...");
        if (!validateAnalyticsFiles()) {
          process.exit(1);
        }

        const app = express();
        const port = 5555;

        // Basic HTML template for the documentation
        app.get("/", (req: Request, res: Response) => {
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

          const events = getAllEvents({ verbose: true });
          
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
          opener(`http://localhost:${port}`);
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
      } catch (error) {
        console.error("❌ Error starting documentation server:", error);
        process.exit(1);
      }
    });
} 