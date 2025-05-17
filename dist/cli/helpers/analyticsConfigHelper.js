"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readGenerationConfigFiles = readGenerationConfigFiles;
const fileValidation_1 = require("../validation/fileValidation");
function readGenerationConfigFiles(genConfig) {
    // Read events file
    const events = (0, fileValidation_1.parseSchemaFile)(genConfig.events);
    if (!events.isValid || !events.data) {
        throw new Error(`Failed to parse events file: ${genConfig.events}`);
    }
    // Read groups files
    const groups = [];
    if (genConfig.groups) {
        for (const groupFile of genConfig.groups) {
            const groupResult = (0, fileValidation_1.parseSchemaFile)(groupFile);
            if (!groupResult.isValid || !groupResult.data) {
                throw new Error(`Failed to parse groups file: ${groupFile}`);
            }
            groups.push(...groupResult.data.groups);
        }
    }
    // Read dimensions files
    const dimensions = [];
    if (genConfig.dimensions) {
        for (const dimensionFile of genConfig.dimensions) {
            const dimensionResult = (0, fileValidation_1.parseSchemaFile)(dimensionFile);
            if (!dimensionResult.isValid || !dimensionResult.data) {
                throw new Error(`Failed to parse dimensions file: ${dimensionFile}`);
            }
            dimensions.push(...dimensionResult.data.dimensions);
        }
    }
    // Read meta file
    let meta = [];
    if (genConfig.meta) {
        const metaResult = (0, fileValidation_1.parseSchemaFile)(genConfig.meta);
        if (!metaResult.isValid || !metaResult.data) {
            throw new Error(`Failed to parse meta file: ${genConfig.meta}`);
        }
        meta = metaResult.data.meta;
    }
    return {
        events: events.data,
        globals: {
            groups,
            dimensions,
            meta
        }
    };
}
