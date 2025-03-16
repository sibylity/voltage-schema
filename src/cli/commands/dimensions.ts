import fs from "fs";
import path from "path";
import { Command } from "commander";
import { type AnalyticsConfig, type AnalyticsGlobals, type AnalyticsEvents } from "../../types";

const configPath = path.resolve(process.cwd(), "analytics.config.json");

export function registerDimensionsCommand(program: Command) {
  program
    .command("dimensions")
    .description("List all events grouped by dimension")
    .action(() => {
      if (!fs.existsSync(configPath)) {
        console.error("❌ analytics.config.json file is missing.");
        process.exit(1);
      }

      const config = JSON.parse(fs.readFileSync(configPath, "utf8")) as AnalyticsConfig;
      
      // Process first generation config for dimensions command
      const genConfig = config.generates[0];
      const globalsPath = path.resolve(process.cwd(), genConfig.globals);
      const eventsPath = path.resolve(process.cwd(), genConfig.events);

      if (!fs.existsSync(globalsPath) || !fs.existsSync(eventsPath)) {
        console.error("❌ Required analytics files are missing.");
        process.exit(1);
      }

      const globals = JSON.parse(fs.readFileSync(globalsPath, "utf8")) as AnalyticsGlobals;
      const events = JSON.parse(fs.readFileSync(eventsPath, "utf8")) as AnalyticsEvents;

      // Initialize map of dimensions to event names
      const dimensionMap: Record<string, string[]> = {};

      // Initialize all dimensions as keys
      globals.dimensions.forEach((dim) => {
        dimensionMap[dim.name] = [];
      });

      // Populate dimensionMap with events
      Object.entries(events.events).forEach(([eventKey, event]) => {
        if (event.dimensions) {
          event.dimensions.forEach((dim) => {
            if (!dimensionMap[dim]) {
              console.warn(`⚠️  Dimension "${dim}" in event "${eventKey}" is not listed in globals.dimensions.`);
              return;
            }
            dimensionMap[dim].push(eventKey);
          });
        }
      });

      // Convert to array format
      const dimensionList = Object.entries(dimensionMap).map(([dimension, events]) => ({
        dimension,
        events,
      }));

      console.log(JSON.stringify(dimensionList, null, 2));
    });
} 