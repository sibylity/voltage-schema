"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateFileExists = validateFileExists;
exports.validateFileExtension = validateFileExtension;
exports.parseJsonFile = parseJsonFile;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
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
function validateFileExtension(filePath, allowedExtensions, context) {
    const ext = path_1.default.extname(filePath).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
        const configMsg = context.configIndex !== undefined ? ` in generation config #${context.configIndex + 1}` : "";
        return {
            isValid: false,
            errors: [`Invalid file extension for ${path_1.default.basename(filePath)}${configMsg}. Expected: ${allowedExtensions.join(", ")}`]
        };
    }
    return { isValid: true };
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
