import fs from "fs";
import path from "path";
import { Command } from "commander";
import { type AnalyticsConfig, type AnalyticsGlobals, type AnalyticsEvents } from "../../types";
import { validateAnalyticsFiles } from "../validation";

const configPath = path.resolve(process.cwd(), "analytics.config.json");

export function registerGenerateCommand(program: Command) {
  program
    .command("generate")
    .description("Generate tracking configs & TypeScript types from analytics files")
    .option("--no-descriptions", "Exclude description fields from the generated output", true)
    .action(() => {
      console.log("🔍 Running validation before generating...");
      if (!validateAnalyticsFiles()) return;

      const config = JSON.parse(fs.readFileSync(configPath, "utf8")) as AnalyticsConfig;
      const noDescriptions = true; // Default is to ignore descriptions

      // Process each generation config
      for (const genConfig of config.generates) {
        const globalsPath = path.resolve(process.cwd(), genConfig.globals);
        const eventsPath = path.resolve(process.cwd(), genConfig.events);
        const outputPath = path.resolve(process.cwd(), genConfig.output);
        const outputDir = path.dirname(outputPath);

        const globals = JSON.parse(fs.readFileSync(globalsPath, "utf8")) as AnalyticsGlobals;
        const events = JSON.parse(fs.readFileSync(eventsPath, "utf8")) as AnalyticsEvents;

        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        console.log(`📁 Generating TypeScript files in ${outputDir}...`);

        // Generate trackingConfig object
        const trackingConfig = {
          globalProperties: globals.properties.map((prop) => ({
            name: prop.name,
            type: prop.type,
            ...(noDescriptions ? {} : { description: prop.description })
          })),
          events: Object.fromEntries(
            Object.entries(events.events).map(([eventKey, event]) => [
              eventKey,
              {
                name: event.name,
                properties: event.properties?.map((prop) => ({
                  name: prop.name,
                  type: prop.type,
                  ...(noDescriptions ? {} : { description: prop.description })
                })) || []
              }
            ])
          )
        };

        // Generate TypeScript definitions
        const analyticsTypes = `
export type TrackingEvent = ${Object.keys(events.events)
          .map((eventKey) => `"${eventKey}"`)
          .join(" | ")};

export type EventProperties = {
${Object.entries(events.events)
          .map(([eventKey, event]) => {
            const properties = (event.properties?.map((prop) => `    "${prop.name}": ${prop.type};`).join("\n")) || "    // No properties";
            return `  "${eventKey}": {\n${properties}\n  };`;
          })
          .join("\n")}
};

export type GlobalProperties = {
${globals.properties
          .map((prop) => `  "${prop.name}": ${prop.type};`)
          .join("\n")}
};

// 🔹 Tracking config object
export const trackingConfig = ${JSON.stringify(trackingConfig, null, 2)} as const;

// 🔹 Enforce type safety on tracking
export interface Tracker {
  track<E extends TrackingEvent>(
    event: E,
    properties: EventProperties[E]
  ): void;
};
`;

        fs.writeFileSync(outputPath, analyticsTypes);
        console.log(`✅ Generated tracking config and TypeScript definitions in ${outputPath}`);
      }
    });
} 