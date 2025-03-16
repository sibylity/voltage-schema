import fs from "fs";
import path from "path";
import Ajv from "ajv";
import { type AnalyticsConfig } from "../../types";

const ajv = new Ajv();

// Load config schema
const configSchemaPath = path.resolve(__dirname, "../../schemas/analytics.config.schema.json");
const configSchema = JSON.parse(fs.readFileSync(configSchemaPath, "utf8"));
const validateConfigSchema = ajv.compile(configSchema);

function validateFileExtension(filePath: string, allowedExtensions: string[]): boolean {
  const ext = path.extname(filePath).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    return false;
  }
  return true;
}

export function getAnalyticsConfig(): AnalyticsConfig {
  const configPath = path.resolve(process.cwd(), "analytics.config.json");
  
  if (!fs.existsSync(configPath)) {
    console.error("❌ analytics.config.json file is missing in project root.");
    process.exit(1);
  }

  try {
    return JSON.parse(fs.readFileSync(configPath, "utf8")) as AnalyticsConfig;
  } catch (error) {
    console.error("❌ Failed to parse analytics.config.json:", error);
    process.exit(1);
  }
}

export function validateAnalyticsConfig(config: AnalyticsConfig): boolean {
  if (!validateConfigSchema(config)) {
    console.error("❌ Config schema validation failed:", validateConfigSchema.errors);
    return false;
  }

  let isValid = true;

  // Validate each generation config
  config.generates.forEach((genConfig, index) => {
    console.log(`\n🔍 Validating generation config #${index + 1}:`);

    // Validate events file
    if (!genConfig.events) {
      console.error(`❌ Missing required "events" field in generation config #${index + 1}`);
      isValid = false;
    } else if (!validateFileExtension(genConfig.events, [".json"])) {
      console.error(`❌ Invalid file extension for events file "${genConfig.events}". Expected: .json`);
      isValid = false;
    }

    // Validate globals file if provided
    if (genConfig.globals) {
      if (!validateFileExtension(genConfig.globals, [".json"])) {
        console.error(`❌ Invalid file extension for globals file "${genConfig.globals}". Expected: .json`);
        isValid = false;
      }
    }

    // Validate output file
    if (!genConfig.output) {
      console.error(`❌ Missing required "output" field in generation config #${index + 1}`);
      isValid = false;
    } else if (!validateFileExtension(genConfig.output, [".js", ".ts", ".tsx"])) {
      console.error(`❌ Invalid file extension for output file "${genConfig.output}". Expected one of: .js, .ts, .tsx`);
      isValid = false;
    }
  });

  if (isValid) {
    console.log("\n✅ All generation configs are valid");
  }

  return isValid;
} 