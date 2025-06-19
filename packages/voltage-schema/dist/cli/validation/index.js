"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultGroups = exports.validateGroups = exports.validateAnalyticsConfig = exports.validateEvents = exports.validateAnalyticsFiles = void 0;
__exportStar(require("./types"), exports);
__exportStar(require("./fileValidation"), exports);
__exportStar(require("./schemaValidation"), exports);
__exportStar(require("./logging"), exports);
var validateAnalyticsFiles_1 = require("./validateAnalyticsFiles");
Object.defineProperty(exports, "validateAnalyticsFiles", { enumerable: true, get: function () { return validateAnalyticsFiles_1.validateAnalyticsFiles; } });
var validateAnalyticsEvents_1 = require("./validateAnalyticsEvents");
Object.defineProperty(exports, "validateEvents", { enumerable: true, get: function () { return validateAnalyticsEvents_1.validateEvents; } });
var validateAnalyticsConfig_1 = require("./validateAnalyticsConfig");
Object.defineProperty(exports, "validateAnalyticsConfig", { enumerable: true, get: function () { return validateAnalyticsConfig_1.validateAnalyticsConfig; } });
var validateAnalyticsGroups_1 = require("./validateAnalyticsGroups");
Object.defineProperty(exports, "validateGroups", { enumerable: true, get: function () { return validateAnalyticsGroups_1.validateGroups; } });
Object.defineProperty(exports, "defaultGroups", { enumerable: true, get: function () { return validateAnalyticsGroups_1.defaultGroups; } });
