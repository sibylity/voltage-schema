"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createValidator = createValidator;
const fs_1 = __importDefault(require("fs"));
const ajv_1 = __importDefault(require("ajv"));
function createValidator(schemaPath) {
    const ajv = new ajv_1.default();
    const schema = JSON.parse(fs_1.default.readFileSync(schemaPath, "utf8"));
    return ajv.compile(schema);
}
