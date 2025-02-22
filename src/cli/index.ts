import { program } from "commander";
import fs from "fs";
import path from "path";
import Ajv from "ajv";
import { type AnalyticsSchema } from '../types';

const ajv = new Ajv();
const schemaPath = path.resolve(__dirname, "../schemas/analytics.schema.json");
const analyticsPath = path.resolve(process.cwd(), "analytics.json");
const defaultAnalyticsPath = path.resolve(__dirname, "../schemas/analytics.default.json");
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
const validate = ajv.compile(schema);

// Command to validate the analytics.json file
program
  .command("validate")
  .description("Validate the analytics.json file and check event structure")
  .action(() => {
    if (!fs.existsSync(analyticsPath)) {
      console.error("❌ analytics.json file is missing.");
      process.exit(1);
    }

    const data: AnalyticsSchema = JSON.parse(fs.readFileSync(analyticsPath, "utf8"));

    // ✅ Validate against the JSON Schema
    if (!validate(data)) {
      console.error("❌ Schema validation failed:", validate.errors);
      process.exit(1);
    }

    const validDimensions = new Set(data.validDimensions || []);
    let hasInvalidData = false;

    // ✅ Iterate over the events object instead of an array
    Object.entries(data.events).forEach(([eventKey, event]) => {
      console.log(`🔍 Validating event: ${eventKey}`);

      // ✅ Validate event dimensions exist in validDimensions
      if (event.dimensions) {
        event.dimensions.forEach((dim) => {
          if (!validDimensions.has(dim)) {
            console.error(`❌ Invalid dimension "${dim}" in event "${eventKey}". It is not listed in validDimensions.`);
            hasInvalidData = true;
          }
        });
      }

      // ✅ Validate that event properties follow schema
      if (event.properties) {
        event.properties.forEach((prop) => {
          if (!prop.name || !prop.type) {
            console.error(`❌ Property in event "${eventKey}" is missing required fields (name, type).`);
            hasInvalidData = true;
          }
        });
      }
    });

    if (hasInvalidData) {
      process.exit(1);
    }

    console.log("✅ analytics.json is valid, and all events have correct structures.");
  });

// Command to generate an analytics.json file
program
  .command("init")
  .description("Create a default analytics.json file")
  .option("--reset", "Replace the existing analytics.json file")
  .action((options) => {
    if (!fs.existsSync(defaultAnalyticsPath)) {
      console.error("❌ analytics.default.json file is missing. Please create it.");
      process.exit(1);
    }

    if (fs.existsSync(analyticsPath) && !options.reset) {
      console.warn("⚠️ analytics.json already exists. Use --reset to overwrite it.");
      process.exit(1);
    }

    // Read default config from analytics.default.json
    const defaultConfig = fs.readFileSync(defaultAnalyticsPath, "utf8");

    fs.writeFileSync(analyticsPath, defaultConfig);
    console.log(`✅ analytics.json ${options.reset ? "reset" : "created"} successfully!`);
  });


program.parse(process.argv);