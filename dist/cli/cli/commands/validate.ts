import fs from "fs";
import path from "path";
import { Command } from "commander";
import { validateAnalyticsFiles } from "../validation";

export function registerValidateCommand(program: Command) {
  program
    .command("validate")
    .description("Validate the analytics configuration files and check event structure")
    .action(() => {
      validateAnalyticsFiles();
    });
} 