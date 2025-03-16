import fs from "fs";
import path from "path";
import Ajv from "ajv";
import { type AnalyticsGlobals } from "../../types";

const ajv = new Ajv();

// Load globals schema
const globalsSchemaPath = path.resolve(__dirname, "../../schemas/analytics.globals.schema.json");
const globalsSchema = JSON.parse(fs.readFileSync(globalsSchemaPath, "utf8"));
const validateGlobalsSchema = ajv.compile(globalsSchema);

// Default empty globals when file is not provided
export const defaultGlobals: AnalyticsGlobals = {
  dimensions: [],
  properties: []
};

function validateGlobalDimensions(dimensions: AnalyticsGlobals["dimensions"]): boolean {
  let isValid = true;

  dimensions.forEach((dimension) => {
    if (!dimension.name) {
      console.error("❌ A dimension is missing a name.");
      isValid = false;
      return;
    }

    if (!dimension.identifiers || dimension.identifiers.length === 0) {
      console.error(`❌ Dimension "${dimension.name}" has no identifiers.`);
      isValid = false;
      return;
    }

    dimension.identifiers.forEach((identifier, index) => {
      if (!identifier.property) {
        console.error(`❌ Identifier #${index + 1} in dimension "${dimension.name}" is missing a "property" field.`);
        isValid = false;
      }

      // Ensure only one evaluation field is set
      const evaluationFields = ["contains", "equals", "not", "in", "notIn", "startsWith", "endsWith", "lt", "lte", "gt", "gte"];
      const activeFields = evaluationFields.filter((field) => field in identifier);

      if (activeFields.length === 0) {
        console.error(`❌ Identifier for property "${identifier.property}" in dimension "${dimension.name}" is missing an evaluation field.`);
        isValid = false;
      } else if (activeFields.length > 1) {
        console.error(`❌ Identifier for property "${identifier.property}" in dimension "${dimension.name}" has multiple evaluation fields (${activeFields.join(", ")}). Only one is allowed.`);
        isValid = false;
      }
    });
  });

  return isValid;
}

function validateGlobalProperties(properties: AnalyticsGlobals["properties"]): boolean {
  let isValid = true;

  properties.forEach((prop) => {
    if (!prop.name || !prop.type) {
      console.error(`❌ Global property "${prop.name || "[Unnamed]"}" is missing required fields (name, type).`);
      isValid = false;
    }
  });

  return isValid;
}

export function validateGlobals(globalsPath: string): { isValid: boolean; globals: AnalyticsGlobals } {
  let globals: AnalyticsGlobals;
  
  // If globals file doesn't exist, use defaults
  if (!fs.existsSync(globalsPath)) {
    console.log(`ℹ️ No globals file found at ${globalsPath}, using default empty values.`);
    return { isValid: true, globals: defaultGlobals };
  }

  try {
    globals = JSON.parse(fs.readFileSync(globalsPath, "utf8")) as AnalyticsGlobals;
  } catch (error) {
    console.error(`❌ Failed to parse globals file at ${globalsPath}:`, error);
    return { isValid: false, globals: defaultGlobals };
  }

  // Validate globals schema
  if (!validateGlobalsSchema(globals)) {
    console.error(`❌ Globals schema validation failed for ${globalsPath}:`, validateGlobalsSchema.errors);
    return { isValid: false, globals };
  }

  console.log(`✅ Validating global properties for ${globalsPath}...`);
  const propertiesValid = validateGlobalProperties(globals.properties);

  console.log(`✅ Validating global dimensions for ${globalsPath}...`);
  const dimensionsValid = validateGlobalDimensions(globals.dimensions);

  return { isValid: propertiesValid && dimensionsValid, globals };
} 