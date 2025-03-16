"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerValidateCommand = registerValidateCommand;
const validation_1 = require("../validation");
function registerValidateCommand(program) {
    program
        .command("validate")
        .description("Validate the analytics configuration files and check event structure")
        .action(() => {
        (0, validation_1.validateAnalyticsFiles)();
    });
}
