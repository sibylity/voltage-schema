"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDimensionsCommand = registerDimensionsCommand;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const configPath = path_1.default.resolve(process.cwd(), "analytics.config.json");
function registerDimensionsCommand(program) {
    program
        .command("dimensions")
        .description("List all events grouped by dimension")
        .action(() => {
        if (!fs_1.default.existsSync(configPath)) {
            console.error("❌ analytics.config.json file is missing.");
            process.exit(1);
        }
        const config = JSON.parse(fs_1.default.readFileSync(configPath, "utf8"));
        // Process first generation config for dimensions command
        const genConfig = config.generates[0];
        const globalsPath = path_1.default.resolve(process.cwd(), genConfig.globals);
        const eventsPath = path_1.default.resolve(process.cwd(), genConfig.events);
        if (!fs_1.default.existsSync(globalsPath) || !fs_1.default.existsSync(eventsPath)) {
            console.error("❌ Required analytics files are missing.");
            process.exit(1);
        }
        const globals = JSON.parse(fs_1.default.readFileSync(globalsPath, "utf8"));
        const events = JSON.parse(fs_1.default.readFileSync(eventsPath, "utf8"));
        // Initialize map of dimensions to event names
        const dimensionMap = {};
        // Initialize all dimensions as keys
        globals.dimensions.forEach((dim) => {
            dimensionMap[dim.name] = [];
        });
        // Populate dimensionMap with events
        Object.entries(events.events).forEach(([eventKey, event]) => {
            if (event.dimensions) {
                event.dimensions.forEach((dim) => {
                    if (!dimensionMap[dim]) {
                        console.warn(`⚠️  Dimension "${dim}" in event "${eventKey}" is not listed in globals.dimensions.`);
                        return;
                    }
                    dimensionMap[dim].push(eventKey);
                });
            }
        });
        // Convert to array format
        const dimensionList = Object.entries(dimensionMap).map(([dimension, events]) => ({
            dimension,
            events,
        }));
        console.log(JSON.stringify(dimensionList, null, 2));
    });
}
