import fs from "fs";
import path from "path";
import { CLI } from "../cli";

export function registerInitCommand(cli: CLI) {
  cli
    .command("init", "Initialize a new analytics schema")
    .option("--reset", "Reset existing files")
    .action((options: { reset?: boolean }) => {
      const defaultAllGroupsPath = path.resolve(__dirname, "../../schemas/defaults/analytics.all-groups.default.json");
      const defaultAllDimensionsPath = path.resolve(__dirname, "../../schemas/defaults/analytics.all-dimensions.default.json");
      const defaultEventsPath = path.resolve(__dirname, "../../schemas/defaults/analytics.events.default.json");

      const files = [
        { src: defaultAllGroupsPath, dest: "analytics.all-groups.yaml", name: "all-groups" },
        { src: defaultAllDimensionsPath, dest: "analytics.all-dimensions.yaml", name: "all-dimensions" },
        { src: defaultEventsPath, dest: "analytics.events.yaml", name: "events" }
      ];

      files.forEach(({ src, dest, name }) => {
        const destPath = path.resolve(process.cwd(), dest);
        if (fs.existsSync(destPath) && !options.reset) {
          console.log(`ℹ️ ${dest} already exists. Use --reset to overwrite.`);
          return;
        }
        fs.copyFileSync(src, destPath);
        console.log(`✅ Created ${dest}`);
      });

      // Generate voltage.config.js instead of voltage.config.js
      const configPath = path.resolve(process.cwd(), "voltage.config.js");
      if (fs.existsSync(configPath) && !options.reset) {
        console.log("ℹ️ voltage.config.js already exists. Use --reset to overwrite.");
        return;
      }
      const config = {
        generates: [
          {
            events: "./analytics.events.yaml",
            groups: ["./analytics.all-groups.yaml"],
            dimensions: ["./analytics.all-dimensions.yaml"],
            output: "./__analytics_generated__/analytics.ts"
          }
        ]
      };
      fs.writeFileSync(configPath, `module.exports = ${JSON.stringify(config, null, 2)};`);
      console.log("✅ Created voltage.config.js");
    });
}
