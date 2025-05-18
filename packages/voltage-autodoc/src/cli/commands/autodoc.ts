import { Command } from "commander";
import express, { Request, Response } from "express";
import opener from "opener";
import { validateAnalyticsFiles } from "../validation";
import { generateAutodocHtml } from "../utils/autodocUtils";

interface Property {
  name: string;
  type: string;
  description?: string;
  source: 'event' | 'group';
  groupName?: string;
}

interface Dimension {
  name: string;
}

interface Contributor {
  name: string;
}

interface AnalyticsEvent {
  name: string;
  key: string;
  description?: string;
  dimensions?: Dimension[];
  properties: Property[];
  contributors?: Contributor[];
  updated?: string;
}

interface AppState {
  events: AnalyticsEvent[];
  filters: {
    search: string;
    dimension: string;
    activeFilters: Set<string>;
  };
  grouping: 'dimension' | 'date' | 'none';
}

// Declare types for DOM elements to avoid TypeScript errors
declare global {
  interface Window {
    state: AppState;
    addFilter: (type: string, value: string) => void;
    removeFilter: (filter: string) => void;
    filterAndRenderEvents: () => void;
    formatDate: (dateStr: string) => string;
  }
}

export function registerAutodocCommand(program: Command) {
  program
    .command("autodoc")
    .description("Start a local server to view analytics documentation")
    .option("--output-html", "Output the generated HTML instead of starting a server")
    .action(async (options) => {
      try {
        console.log("🔍 Running validation before generating documentation...");
        if (!validateAnalyticsFiles()) {
          process.exit(1);
        }

        const autodocHtml = generateAutodocHtml();

        if (options.outputHtml) {
          // Output the HTML directly
          console.log(autodocHtml);
          return;
        }

        // Start server mode
        const app = express();
        const port = 5555;

        // Serve static assets
        app.get("/", (req: Request, res: Response) => {
          res.send(autodocHtml);
        });

        // Start the server
        app.listen(port, () => {
          console.log("📚 Documentation server running at http://localhost:" + port);
          console.log("Press 'q' to quit");

          // Open the browser
          opener("http://localhost:" + port);
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
        console.error("❌ Error:", error);
        process.exit(1);
      }
    });
}
