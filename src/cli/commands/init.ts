import fs from "fs";
import path from "path";
import { Command } from "commander";

// Default paths
const configPath = path.resolve(process.cwd(), "analytics.config.json");
const defaultConfigPath = path.resolve(__dirname, "../../schemas/defaults/analytics.config.default.json");
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
        { src: defaultAllGroupsPath, dest: "analytics.all-groups.json", name: "all-groups" },
        { src: defaultAllDimensionsPath, dest: "analytics.all-dimensions.json", name: "all-dimensions" },
        { src: defaultEventsPath, dest: "analytics.events.json", name: "events" }
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
        fs.writeFileSync(destPath, defaultContent);
        console.log(`✅ ${file.dest} ${options.reset ? "reset" : "created"} successfully!`);
      });
    });
} 