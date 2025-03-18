"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatValidationErrors = formatValidationErrors;
exports.logValidationStart = logValidationStart;
exports.logValidationSuccess = logValidationSuccess;
exports.logValidationErrors = logValidationErrors;
const path_1 = __importDefault(require("path"));
function formatValidationErrors(errors) {
    return errors.map(error => `❌ ${error}`).join("\n");
}
function logValidationStart(context) {
    const configMsg = context.configIndex !== undefined ? ` for generation config #${context.configIndex + 1}` : "";
    console.log(`🔍 Validating ${path_1.default.basename(context.filePath)}${configMsg}...`);
}
function logValidationSuccess(context) {
    console.log(`✅ ${path_1.default.basename(context.filePath)} is valid.`);
}
function logValidationErrors(errors) {
    console.error(formatValidationErrors(errors));
}
