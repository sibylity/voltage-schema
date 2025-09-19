import fs from "fs";
import path from "path";
import { CLI } from "../cli";

export function registerInitCommand(cli: CLI) {
  cli
    .command("init", "Initialize a new analytics schema")
    .option("--reset", "Reset existing files")
    .option("--single-file", "Create a single merged schema file instead of separate files")
    .action((options: { reset?: boolean; "single-file"?: boolean }) => {
      const defaultAllGroupsPath = path.resolve(__dirname, "../../schemas/defaults/analytics.all-groups.default.json");
      const defaultAllDimensionsPath = path.resolve(__dirname, "../../schemas/defaults/analytics.all-dimensions.default.json");
      const defaultEventsPath = path.resolve(__dirname, "../../schemas/defaults/analytics.events.default.json");

      if (options["single-file"]) {
        // Create a single merged schema file
        const mergedSchemaPath = path.resolve(process.cwd(), "analytics.schema.yaml");
        if (fs.existsSync(mergedSchemaPath) && !options.reset) {
          console.log("ℹ️ analytics.schema.yaml already exists. Use --reset to overwrite.");
        } else {
          // Read the default files
          const eventsData = JSON.parse(fs.readFileSync(defaultEventsPath, 'utf8'));
          const groupsData = JSON.parse(fs.readFileSync(defaultAllGroupsPath, 'utf8'));
          const dimensionsData = JSON.parse(fs.readFileSync(defaultAllDimensionsPath, 'utf8'));

          // Create merged schema
          const mergedSchema = {
            events: eventsData.events,
            groups: groupsData.groups,
            dimensions: dimensionsData.dimensions
          };

          // Write as YAML (for now, write as JSON - we can add YAML conversion later)
          fs.writeFileSync(mergedSchemaPath, JSON.stringify(mergedSchema, null, 2));
          console.log("✅ Created analytics.schema.yaml");
        }

        // Create config for single file
        const configPath = path.resolve(process.cwd(), "voltage.config.js");
        if (fs.existsSync(configPath) && !options.reset) {
          console.log("ℹ️ voltage.config.js already exists. Use --reset to overwrite.");
        } else {
          const config = {
            generates: [
              {
                mergedSchemaFile: "./analytics.schema.yaml",
                output: "./__analytics_generated__/analytics.ts"
              }
            ]
          };
          fs.writeFileSync(configPath, `module.exports = ${JSON.stringify(config, null, 2)};`);
          console.log("✅ Created voltage.config.js");
        }
      } else {
        // Create separate files (existing behavior)
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

        // Generate voltage.config.js
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
      }
    });
}
