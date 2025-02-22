import { program } from "commander";
import fs from "fs";
import path from "path";
import Ajv from "ajv";

const ajv = new Ajv();
const schemaPath = path.resolve(__dirname, "./schemas/analytics.schema.json");
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
const validate = ajv.compile(schema);
const analyticsPath = path.resolve(process.cwd(), "analytics.json");

interface Property {
  name: string;
  description: string;
  type: string | string[];
}

interface AnalyticsSchema {
  version: string;
  validDimensions: string[];
  globalProperties: Property[];
  events: {
    name: string;
    description: string;
    version?: string;
    dimensions?: string[];
    properties?: Property[];
  }[];
}


// Utility to read the analytics file
function readAnalyticsFile(): any {
  if (!fs.existsSync(analyticsPath)) {
    console.warn("⚠️  analytics.json not found. Run `json-schema-cli init` to create one.");
    return null;
  }
  return JSON.parse(fs.readFileSync(analyticsPath, "utf8"));
}

// Command to validate the analytics.json file
program
  .command("validate")
  .description("Validate the analytics.json file and check dimensions")
  .action(() => {
    const analyticsPath = path.resolve(process.cwd(), "analytics.json");

    if (!fs.existsSync(analyticsPath)) {
      console.error("❌ analytics.json file is missing.");
      process.exit(1);
    }

    // Explicitly type the parsed data
    const data: AnalyticsSchema = JSON.parse(fs.readFileSync(analyticsPath, "utf8"));

    if (!validate(data)) {
      console.error("❌ Schema validation failed:", validate.errors);
      process.exit(1);
    }

    // ✅ Validate event dimensions exist in validDimensions
    const validDimensions = new Set(data.validDimensions || []);
    let hasInvalidDimensions = false;

    data.events.forEach((event) => {
      if (event.dimensions) {
        event.dimensions.forEach((dim) => {
          if (!validDimensions.has(dim)) {
            console.error(`❌ Invalid dimension "${dim}" in event "${event.name}". It is not listed in validDimensions.`);
            hasInvalidDimensions = true;
          }
        });
      }
    });

    if (hasInvalidDimensions) {
      process.exit(1);
    }

    console.log("✅ analytics.json is valid.");
  });

// Command to generate an analytics.json file
program
  .command("init")
  .description("Create a default analytics.json file")
  .option("--reset", "Replace the existing analytics.json file")
  .action((options) => {
    if (fs.existsSync(analyticsPath) && !options.reset) {
      console.warn("⚠️ analytics.json already exists. Use --reset to overwrite it.");
      process.exit(1);
    }

    const defaultConfig = {
      globalProperties: [
        {
          name: "url",
          description: "The URL of the page when the event was triggered.",
          type: "string",
        },
        {
          name: "userId",
          description: "The ID of the user that triggered the event.",
          type: "number",
        }
      ],
      events: [
        {
          name: "Page View",
          description: "This events is triggered everytime the user views a page.",
          properties: []
        }
      ]
    };

    fs.writeFileSync(analyticsPath, JSON.stringify(defaultConfig, null, 2));
    console.log(`✅ analytics.json ${options.reset ? "reset" : "created"} successfully!`);
  });

program.parse(process.argv);