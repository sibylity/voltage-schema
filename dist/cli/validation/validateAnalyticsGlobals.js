"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultGlobals = void 0;
exports.validateGlobals = validateGlobals;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const ajv_1 = __importDefault(require("ajv"));
const ajv = new ajv_1.default();
// Load globals schema
const globalsSchemaPath = path_1.default.resolve(__dirname, "../../schemas/analytics.globals.schema.json");
const globalsSchema = JSON.parse(fs_1.default.readFileSync(globalsSchemaPath, "utf8"));
const validateGlobalsSchema = ajv.compile(globalsSchema);
// Default empty globals when file is not provided
exports.defaultGlobals = {
    dimensions: [],
    properties: []
};
function validateGlobalDimensions(dimensions) {
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
            }
            else if (activeFields.length > 1) {
                console.error(`❌ Identifier for property "${identifier.property}" in dimension "${dimension.name}" has multiple evaluation fields (${activeFields.join(", ")}). Only one is allowed.`);
                isValid = false;
            }
        });
    });
    return isValid;
}
function validateGlobalProperties(properties) {
    let isValid = true;
    properties.forEach((prop) => {
        if (!prop.name || !prop.type) {
            console.error(`❌ Global property "${prop.name || "[Unnamed]"}" is missing required fields (name, type).`);
            isValid = false;
        }
    });
    return isValid;
}
function validateGlobals(globalsPath) {
    let globals;
    // If globals file doesn't exist, use defaults
    if (!fs_1.default.existsSync(globalsPath)) {
        console.log(`ℹ️ No globals file found at ${globalsPath}, using default empty values.`);
        return { isValid: true, globals: exports.defaultGlobals };
    }
    try {
        globals = JSON.parse(fs_1.default.readFileSync(globalsPath, "utf8"));
    }
    catch (error) {
        console.error(`❌ Failed to parse globals file at ${globalsPath}:`, error);
        return { isValid: false, globals: exports.defaultGlobals };
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
