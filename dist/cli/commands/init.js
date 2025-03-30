"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerInitCommand = registerInitCommand;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Default paths
const configPath = path_1.default.resolve(process.cwd(), "analytics.config.json");
const defaultConfigPath = path_1.default.resolve(__dirname, "../../schemas/defaults/analytics.config.default.json");
const defaultAllGroupsPath = path_1.default.resolve(__dirname, "../../schemas/defaults/analytics.all-groups.default.json");
const defaultEventsPath = path_1.default.resolve(__dirname, "../../schemas/defaults/analytics.events.default.json");
function registerInitCommand(program) {
    program
        .command("init")
        .description("Create default analytics configuration files")
        .option("--reset", "Replace existing analytics files")
        .action((options) => {
        const files = [
            { src: defaultConfigPath, dest: configPath, name: "config" },
            { src: defaultAllGroupsPath, dest: "analytics.all-groups.json", name: "all-groups" },
            { src: defaultEventsPath, dest: "analytics.events.json", name: "events" }
        ];
        for (const file of files) {
            if (!fs_1.default.existsSync(file.src)) {
                console.error(`❌ ${file.name} default file is missing. Please create it.`);
                process.exit(1);
            }
            const destPath = path_1.default.resolve(process.cwd(), file.dest);
            if (fs_1.default.existsSync(destPath) && !options.reset) {
                console.warn(`⚠️ ${file.dest} already exists. Use --reset to overwrite it.`);
                continue;
            }
            const defaultContent = fs_1.default.readFileSync(file.src, "utf8");
            fs_1.default.writeFileSync(destPath, defaultContent);
            console.log(`✅ ${file.dest} ${options.reset ? "reset" : "created"} successfully!`);
        }
    });
}
