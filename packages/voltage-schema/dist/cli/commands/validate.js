"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerValidateCommand = void 0;
const validation_1 = require("../validation");
function registerValidateCommand(cli) {
    cli
        .command("validate", "Validate the analytics configuration files and check event structure")
        .action((options) => {
        (0, validation_1.validateAnalyticsFiles)();
    });
}
exports.registerValidateCommand = registerValidateCommand;
