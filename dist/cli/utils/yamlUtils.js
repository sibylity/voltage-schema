"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.jsonToYaml = exports.yamlToJson = exports.parseYamlFile = void 0;
const fs_1 = __importDefault(require("fs"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const path_1 = __importDefault(require("path"));
function parseYamlFile(filePath) {
    try {
        const fileContent = fs_1.default.readFileSync(filePath, "utf8");
        const data = js_yaml_1.default.load(fileContent);
        return { isValid: true, data };
    }
    catch (error) {
        return {
            isValid: false,
            errors: [`Failed to parse ${path_1.default.basename(filePath)}: ${error instanceof Error ? error.message : String(error)}`]
        };
    }
}
exports.parseYamlFile = parseYamlFile;
function yamlToJson(yamlContent) {
    try {
        const data = js_yaml_1.default.load(yamlContent);
        return { isValid: true, data };
    }
    catch (error) {
        return {
            isValid: false,
            errors: [`Failed to parse YAML: ${error instanceof Error ? error.message : String(error)}`]
        };
    }
}
exports.yamlToJson = yamlToJson;
function jsonToYaml(jsonContent) {
    return js_yaml_1.default.dump(jsonContent);
}
exports.jsonToYaml = jsonToYaml;
