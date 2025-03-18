import fs from "fs";
import path from "path";
import { Command } from "commander";

// Default paths
const configPath = path.resolve(process.cwd(), "analytics.config.json");
const defaultConfigPath = path.resolve(__dirname, "../../schemas/analytics.config.default.json");
const defaultGlobalsPath = path.resolve(__dirname, "../../schemas/analytics.globals.default.json");
const defaultEventsPath = path.resolve(__dirname, "../../schemas/analytics.events.default.json");

export function registerInitCommand(program: Command) {
  program
    .command("init")
    .description("Create default analytics configuration files")
    .option("--reset", "Replace existing analytics files")
    .action((options) => {
      const files = [
        { src: defaultConfigPath, dest: configPath, name: "config" },
        { src: defaultGlobalsPath, dest: "analytics.globals.json", name: "globals" },
        { src: defaultEventsPath, dest: "analytics.events.json", name: "events" }
      ];

      for (const file of files) {
        if (!fs.existsSync(file.src)) {
          console.error(`❌ ${file.name} default file is missing. Please create it.`);
          process.exit(1);
        }

        const destPath = path.resolve(process.cwd(), file.dest);
        if (fs.existsSync(destPath) && !options.reset) {
          console.warn(`⚠️ ${file.dest} already exists. Use --reset to overwrite it.`);
          continue;
        }

        const defaultContent = fs.readFileSync(file.src, "utf8");
        fs.writeFileSync(destPath, defaultContent);
        console.log(`✅ ${file.dest} ${options.reset ? "reset" : "created"} successfully!`);
      }
    });
} 