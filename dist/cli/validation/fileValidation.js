"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateFileExists = validateFileExists;
exports.validateFileExtension = validateFileExtension;
exports.parseJsonFile = parseJsonFile;
exports.parseSchemaFile = parseSchemaFile;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const yamlUtils_1 = require("../utils/yamlUtils");
function validateFileExists(filePath, isOptional = false) {
    if (!fs_1.default.existsSync(filePath)) {
        if (isOptional) {
            return { isValid: true };
        }
        return {
            isValid: false,
            errors: [`File not found: ${filePath}`]
        };
    }
    return { isValid: true };
}
function validateFileExtension(filePath) {
    const ext = path_1.default.extname(filePath).toLowerCase();
    if (ext !== ".json" && ext !== ".volt" && ext !== ".yaml" && ext !== ".yml") {
        return `Invalid file extension: ${ext}. Expected .json, .volt, .yaml, or .yml`;
    }
    return null;
}
function parseJsonFile(filePath) {
    try {
        const data = JSON.parse(fs_1.default.readFileSync(filePath, "utf8"));
        return { isValid: true, data };
    }
    catch (error) {
        return {
            isValid: false,
            errors: [`Failed to parse ${path_1.default.basename(filePath)}: ${error instanceof Error ? error.message : String(error)}`]
        };
    }
}
function parseSchemaFile(filePath) {
    const ext = path_1.default.extname(filePath).toLowerCase();
    if (ext === ".json") {
        return parseJsonFile(filePath);
    }
    else if (ext === ".volt" || ext === ".yaml" || ext === ".yml") {
        return (0, yamlUtils_1.parseYamlFile)(filePath);
    }
    return {
        isValid: false,
        errors: [`Unsupported file extension: ${ext}`]
    };
}
