"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerInitCommand = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const yamlUtils_1 = require("../utils/yamlUtils");
// Default paths
const configPath = path_1.default.resolve(process.cwd(), "voltage.config.json");
const defaultConfigPath = path_1.default.resolve(__dirname, "../../schemas/defaults/voltage.config.default.json");
const defaultAllDimensionsPath = path_1.default.resolve(__dirname, "../../schemas/defaults/analytics.all-dimensions.default.json");
const defaultAllGroupsPath = path_1.default.resolve(__dirname, "../../schemas/defaults/analytics.all-groups.default.json");
const defaultEventsPath = path_1.default.resolve(__dirname, "../../schemas/defaults/analytics.events.default.json");
function registerInitCommand(cli) {
    cli
        .command("init", "Create default analytics configuration files")
        .option("--reset", "Replace existing analytics files")
        .action((options) => {
        const files = [
            { src: defaultConfigPath, dest: configPath, name: "config" },
            { src: defaultAllGroupsPath, dest: "analytics.all-groups.yaml", name: "all-groups" },
            { src: defaultAllDimensionsPath, dest: "analytics.all-dimensions.yaml", name: "all-dimensions" },
            { src: defaultEventsPath, dest: "analytics.events.yaml", name: "events" }
        ];
        files.forEach(file => {
            if (!fs_1.default.existsSync(file.src)) {
                console.error(`❌ ${file.name} default file is missing. Please create it.`);
                process.exit(1);
            }
            const destPath = path_1.default.resolve(process.cwd(), file.dest);
            if (fs_1.default.existsSync(destPath) && !options.reset) {
                console.warn(`⚠️ ${file.dest} already exists. Use --reset to overwrite it.`);
                return;
            }
            const defaultContent = fs_1.default.readFileSync(file.src, "utf8");
            const jsonData = JSON.parse(defaultContent);
            // Convert to YAML for YAML files, keep as JSON for config
            const outputContent = file.dest.endsWith(".json") ? defaultContent : (0, yamlUtils_1.jsonToYaml)(jsonData);
            fs_1.default.writeFileSync(destPath, outputContent);
            console.log(`✅ ${file.dest} ${options.reset ? "reset" : "created"} successfully!`);
        });
    });
}
exports.registerInitCommand = registerInitCommand;
