import { CLI } from "../cli";
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

export function registerAutodocCommand(cli: CLI) {
  cli
    .command("autodoc", "Open the autodoc in your browser, or output it's HTML for CI")
    .option("--output-html", "Output HTML instead of starting server")
    .action((options: Record<string, boolean>) => {
      try {
        console.log("🔍 Running validation before generating autodoc...");
        if (!validateAnalyticsFiles()) {
          process.exit(1);
        }

        const html = generateAutodocHtml();

        if (options["output-html"]) {
          console.log(html);
        } else {
          const app = express();
          const port = 3000;

          app.get("/", (req: Request, res: Response) => {
            res.send(html);
          });

          app.listen(port, () => {
            console.log(`📚 Autodoc server running at http://localhost:${port}`);
            opener(`http://localhost:${port}`);
          });
        }
      } catch (error) {
        console.error("❌ Error generating autodoc:", error);
        process.exit(1);
      }
    });
}
