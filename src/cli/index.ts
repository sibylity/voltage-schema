import { program } from "commander";
import fs from "fs";
import path from "path";
import Ajv from "ajv";
import { type AnalyticsConfig, type AnalyticsGlobals, type AnalyticsEvents } from "../types";

const ajv = new Ajv();

// Load schemas
const configSchemaPath = path.resolve(__dirname, "../schemas/analytics.config.schema.json");
const globalsSchemaPath = path.resolve(__dirname, "../schemas/analytics.globals.schema.json");
const eventsSchemaPath = path.resolve(__dirname, "../schemas/analytics.events.schema.json");

const configSchema = JSON.parse(fs.readFileSync(configSchemaPath, "utf8"));
const globalsSchema = JSON.parse(fs.readFileSync(globalsSchemaPath, "utf8"));
const eventsSchema = JSON.parse(fs.readFileSync(eventsSchemaPath, "utf8"));

const validateConfig = ajv.compile(configSchema);
const validateGlobals = ajv.compile(globalsSchema);
const validateEvents = ajv.compile(eventsSchema);

// Default paths
const configPath = path.resolve(process.cwd(), "analytics.config.json");
const defaultConfigPath = path.resolve(__dirname, "../schemas/analytics.default.config.json");
const defaultGlobalsPath = path.resolve(__dirname, "../schemas/analytics.default.globals.json");
const defaultEventsPath = path.resolve(__dirname, "../schemas/analytics.default.events.json");

function validateAnalyticsSchema() {
  if (!fs.existsSync(configPath)) {
    console.error("❌ analytics.config.json file is missing.");
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(configPath, "utf8")) as AnalyticsConfig;

  // Validate config schema
  if (!validateConfig(config)) {
    console.error("❌ Config schema validation failed:", validateConfig.errors);
    process.exit(1);
  }

  let hasInvalidData = false;

  // Process each generation config
  for (const genConfig of config.generates) {
    const globalsPath = path.resolve(process.cwd(), genConfig.globals);
    const eventsPath = path.resolve(process.cwd(), genConfig.events);

    if (!fs.existsSync(globalsPath)) {
      console.error(`❌ Globals file not found: ${genConfig.globals}`);
      process.exit(1);
    }

    if (!fs.existsSync(eventsPath)) {
      console.error(`❌ Events file not found: ${genConfig.events}`);
      process.exit(1);
    }

    const globals = JSON.parse(fs.readFileSync(globalsPath, "utf8")) as AnalyticsGlobals;
    const events = JSON.parse(fs.readFileSync(eventsPath, "utf8")) as AnalyticsEvents;

    // Validate globals schema
    if (!validateGlobals(globals)) {
      console.error(`❌ Globals schema validation failed for ${genConfig.globals}:`, validateGlobals.errors);
      hasInvalidData = true;
      continue;
    }

    // Validate events schema
    if (!validateEvents(events)) {
      console.error(`❌ Events schema validation failed for ${genConfig.events}:`, validateEvents.errors);
      hasInvalidData = true;
      continue;
    }

    const validDimensions = new Set(globals.dimensions.map((dim) => dim.name));

    console.log(`✅ Validating global properties for ${genConfig.globals}...`);
    globals.properties.forEach((prop) => {
      if (!prop.name || !prop.type) {
        console.error(`❌ Global property "${prop.name || "[Unnamed]"}" is missing required fields (name, type).`);
        hasInvalidData = true;
      }
    });

    console.log(`✅ Validating global dimensions for ${genConfig.globals}...`);
    globals.dimensions.forEach((dimension) => {
      if (!dimension.name) {
        console.error("❌ A dimension is missing a name.");
        hasInvalidData = true;
        return false;
      }

      if (!dimension.identifiers || dimension.identifiers.length === 0) {
        console.error(`❌ Dimension "${dimension.name}" has no identifiers.`);
        hasInvalidData = true;
        return false;
      }

      dimension.identifiers.forEach((identifier, index) => {
        if (!identifier.property) {
          console.error(`❌ Identifier #${index + 1} in dimension "${dimension.name}" is missing a "property" field.`);
          hasInvalidData = true;
        }

        // Ensure only one evaluation field is set
        const evaluationFields = ["contains", "equals", "not", "in", "notIn", "startsWith", "endsWith", "lt", "lte", "gt", "gte"];
        const activeFields = evaluationFields.filter((field) => field in identifier);

        if (activeFields.length === 0) {
          console.error(`❌ Identifier for property "${identifier.property}" in dimension "${dimension.name}" is missing an evaluation field.`);
          hasInvalidData = true;
        } else if (activeFields.length > 1) {
          console.error(`❌ Identifier for property "${identifier.property}" in dimension "${dimension.name}" has multiple evaluation fields (${activeFields.join(", ")}). Only one is allowed.`);
          hasInvalidData = true;
        }
      });
    });

    // Validate events
    Object.entries(events.events).forEach(([eventKey, event]) => {
      console.log(`🔍 Validating event: ${eventKey}`);

      // Validate event dimensions
      if (event.dimensions) {
        event.dimensions.forEach((dim) => {
          if (!validDimensions.has(dim)) {
            console.error(`❌ Invalid dimension "${dim}" in event "${eventKey}". It is not listed in globals.dimensions.`);
            hasInvalidData = true;
          }
        });
      }

      // Validate event properties
      if (event.properties) {
        event.properties.forEach((prop) => {
          if (!prop.name || !prop.type) {
            console.error(`❌ Property in event "${eventKey}" is missing required fields (name, type).`);
            hasInvalidData = true;
          }
        });
      }
    });
  }

  if (hasInvalidData) {
    process.exit(1);
    return false;
  }

  console.log("✅ All analytics files are valid, and all events have correct structures.");
  return true;
}

// Command to validate the analytics files
program
  .command("validate")
  .description("Validate the analytics configuration files and check event structure")
  .action(() => {
    validateAnalyticsSchema();
  });

// Command to generate default analytics files
program
  .command("init")
  .description("Create default analytics configuration files")
  .option("--reset", "Replace existing analytics files")
  .action((options) => {
    const files = [
      { src: defaultConfigPath, dest: configPath, name: "config" },
      { src: defaultGlobalsPath, dest: "analytics.globals.json", name: "globals" },
      { src: defaultEventsPath, dest: "analytics.events.json", name: "events" }
    ];

    for (const file of files) {
      if (!fs.existsSync(file.src)) {
        console.error(`❌ ${file.name} default file is missing. Please create it.`);
        process.exit(1);
      }

      const destPath = path.resolve(process.cwd(), file.dest);
      if (fs.existsSync(destPath) && !options.reset) {
        console.warn(`⚠️ ${file.dest} already exists. Use --reset to overwrite it.`);
        continue;
      }

      const defaultContent = fs.readFileSync(file.src, "utf8");
      fs.writeFileSync(destPath, defaultContent);
      console.log(`✅ ${file.dest} ${options.reset ? "reset" : "created"} successfully!`);
    }
  });

// Command to list all events grouped by dimension
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

program
  .command("generate")
  .description("Generate tracking configs & TypeScript types from analytics files")
  .option("--no-descriptions", "Exclude description fields from the generated output", true)
  .action(() => {
    console.log("🔍 Running validation before generating...");
    if (!validateAnalyticsSchema()) return;

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

program.parse(process.argv);