#!/usr/bin/env node
import { program } from "commander";
import fs from "fs";
import path from "path";
import Ajv from "ajv";

const ajv = new Ajv();
const schema = require("../schema.json"); // Ensure schema.json is in the project root

program.version("1.0.0").description("A CLI tool to validate JSON files against a schema");

program
  .command("validate <jsonFile>")
  .description("Validate a JSON file against the schema")
  .action((jsonFile: string) => {
    const filePath = path.resolve(process.cwd(), jsonFile);

    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${jsonFile}`);
      process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const validate = ajv.compile(schema);

    if (validate(data)) {
      console.log("✅ JSON is valid!");
    } else {
      console.error("❌ JSON validation failed:", validate.errors);
      process.exit(1);
    }
  });

program.parse(process.argv);
