import fs from "fs";
import path from "path";
import { Command } from "commander";
import { jsonToYaml } from "../utils/yamlUtils";

// Default paths
const configPath = path.resolve(process.cwd(), "voltage.config.json");
const defaultConfigPath = path.resolve(__dirname, "../../schemas/defaults/voltage.config.default.json");
const defaultAllDimensionsPath = path.resolve(__dirname, "../../schemas/defaults/analytics.all-dimensions.default.json");
const defaultAllGroupsPath = path.resolve(__dirname, "../../schemas/defaults/analytics.all-groups.default.json");
const defaultEventsPath = path.resolve(__dirname, "../../schemas/defaults/analytics.events.default.json");

export function registerInitCommand(program: Command) {
  program
    .command("init")
    .description("Create default analytics configuration files")
    .option("--reset", "Replace existing analytics files")
    .action((options) => {
      const files = [
        { src: defaultConfigPath, dest: configPath, name: "config" },
        { src: defaultAllGroupsPath, dest: "analytics.all-groups.volt", name: "all-groups" },
        { src: defaultAllDimensionsPath, dest: "analytics.all-dimensions.volt", name: "all-dimensions" },
        { src: defaultEventsPath, dest: "analytics.events.volt", name: "events" }
      ];

      files.forEach(file => {
        if (!fs.existsSync(file.src)) {
          console.error(`❌ ${file.name} default file is missing. Please create it.`);
          process.exit(1);
        }

        const destPath = path.resolve(process.cwd(), file.dest);
        if (fs.existsSync(destPath) && !options.reset) {
          console.warn(`⚠️ ${file.dest} already exists. Use --reset to overwrite it.`);
          return;
        }

        const defaultContent = fs.readFileSync(file.src, "utf8");
        const jsonData = JSON.parse(defaultContent);

        // Convert to YAML for YAML files, keep as JSON for config
        const outputContent = file.dest.endsWith(".json") ? defaultContent : jsonToYaml(jsonData);
        fs.writeFileSync(destPath, outputContent);
        console.log(`✅ ${file.dest} ${options.reset ? "reset" : "created"} successfully!`);
      });
    });
}
