"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateMeta = validateMeta;
const path_1 = __importDefault(require("path"));
const schemaValidation_1 = require("./schemaValidation");
const fileValidation_1 = require("./fileValidation");
const logging_1 = require("./logging");
const validateMetaSchema = (0, schemaValidation_1.createValidator)(path_1.default.resolve(__dirname, "../../schemas/analytics.meta.schema.json"));
function validateMetaRuleNames(metaRules) {
    const errors = [];
    const ruleNames = new Set();
    metaRules.forEach((rule) => {
        if (ruleNames.has(rule.name)) {
            errors.push(`Duplicate meta rule name "${rule.name}" found in meta file.`);
        }
        else {
            ruleNames.add(rule.name);
        }
    });
    return errors.length > 0 ? { isValid: false, errors } : { isValid: true };
}
function validateMeta(metaPath) {
    var _a;
    const result = (0, fileValidation_1.parseSchemaFile)(metaPath);
    if (!result.isValid || !result.data) {
        (0, logging_1.logValidationErrors)(result.errors || []);
        return result;
    }
    const isValid = validateMetaSchema(result.data);
    if (!isValid) {
        const errors = ((_a = validateMetaSchema.errors) === null || _a === void 0 ? void 0 : _a.map((error) => `Invalid meta file ${metaPath}: ${error.message || "Unknown error"}`)) || [];
        (0, logging_1.logValidationErrors)(errors);
        return { isValid: false, errors };
    }
    // Check for duplicate meta rule names
    const namesResult = validateMetaRuleNames(result.data.meta);
    if (!namesResult.isValid && namesResult.errors) {
        (0, logging_1.logValidationErrors)(namesResult.errors);
        return { isValid: false, errors: namesResult.errors };
    }
    return result;
}
