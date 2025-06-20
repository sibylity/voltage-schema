"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logValidationErrors = exports.logValidationSuccess = exports.logValidationStart = exports.formatValidationErrors = void 0;
const path_1 = __importDefault(require("path"));
function formatValidationErrors(errors) {
    return errors.map(error => `❌ ${error}`).join("\n");
}
exports.formatValidationErrors = formatValidationErrors;
function logValidationStart(context) {
    const configMsg = context.configIndex !== undefined ? ` for generation config #${context.configIndex + 1}` : "";
    console.log(`🔍 Validating ${path_1.default.basename(context.filePath)}${configMsg}...`);
}
exports.logValidationStart = logValidationStart;
function logValidationSuccess(context) {
    console.log(`✅ ${path_1.default.basename(context.filePath)} is valid.`);
}
exports.logValidationSuccess = logValidationSuccess;
function logValidationErrors(errors) {
    console.error(formatValidationErrors(errors));
}
exports.logValidationErrors = logValidationErrors;
