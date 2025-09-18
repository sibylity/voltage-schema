"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeLockFile = exports.generateLockFile = exports.processGenerationConfig = exports.readExistingLockFile = exports.getVoltageSchemaVersion = exports.readSchemaSource = exports.createContentHash = exports.createVersion = exports.parseVersion = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const fileValidation_1 = require("../validation/fileValidation");
/**
 * Parses a version (string or number) into major and minor components
 * Handles migration from old integer versions to new semver format
 */
function parseVersion(version) {
    if (typeof version === 'number') {
        // Legacy integer version - convert to major.0
        return {
            major: version,
            minor: 0
        };
    }
    const parts = version.split('.');
    return {
        major: parseInt(parts[0] || '1', 10),
        minor: parseInt(parts[1] || '0', 10)
    };
}
exports.parseVersion = parseVersion;
/**
 * Creates a version string from major and minor numbers
 */
function createVersion(major, minor) {
    return `${major}.${minor}`;
}
exports.createVersion = createVersion;
// Note: Breaking change detection can be added later if needed
// For now, we'll keep it simple and treat all changes as minor version bumps
/**
 * Creates a deterministic hash for any object
 */
function createContentHash(content) {
    // Create a deep deterministic JSON string with sorted keys at all levels
    const normalizedContent = JSON.stringify(content, (key, value) => {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            // Sort object keys for deterministic output
            const sorted = {};
            Object.keys(value).sort().forEach(k => {
                sorted[k] = value[k];
            });
            return sorted;
        }
        return value;
    });
    return crypto_1.default.createHash('sha256').update(normalizedContent).digest('hex').substring(0, 16);
}
exports.createContentHash = createContentHash;
/**
 * Reads and processes a schema file, returning source data with hash
 */
function readSchemaSource(filePath) {
    const absolutePath = path_1.default.resolve(process.cwd(), filePath);
    if (!fs_1.default.existsSync(absolutePath)) {
        throw new Error(`Schema file not found: ${filePath}`);
    }
    const result = (0, fileValidation_1.parseSchemaFile)(absolutePath);
    if (!result.isValid || !result.data) {
        const errorMessage = result.errors ? result.errors.join(', ') : 'Unknown parsing error';
        throw new Error(`Failed to parse schema file ${filePath}: ${errorMessage}`);
    }
    return {
        file: filePath,
        data: result.data,
        hash: createContentHash(result.data)
    };
}
exports.readSchemaSource = readSchemaSource;
/**
 * Gets the voltage-schema package version
 */
function getVoltageSchemaVersion() {
    try {
        const packageJsonPath = path_1.default.resolve(__dirname, '../../../package.json');
        const packageJson = JSON.parse(fs_1.default.readFileSync(packageJsonPath, 'utf8'));
        return packageJson.version;
    }
    catch (error) {
        // Fallback if we can't read the package.json
        return '0.0.0';
    }
}
exports.getVoltageSchemaVersion = getVoltageSchemaVersion;
/**
 * Reads the existing lock file if it exists
 */
function readExistingLockFile() {
    const lockFilePath = path_1.default.resolve(process.cwd(), 'voltage.lock');
    if (!fs_1.default.existsSync(lockFilePath)) {
        return null;
    }
    try {
        const content = fs_1.default.readFileSync(lockFilePath, 'utf8');
        return JSON.parse(content);
    }
    catch (error) {
        // If we can't parse the existing lock file, treat it as if it doesn't exist
        return null;
    }
}
exports.readExistingLockFile = readExistingLockFile;
/**
 * Processes a generation config and returns the generation entry
 */
function processGenerationConfig(genConfig, existingEntry) {
    const sources = {
        events: readSchemaSource(genConfig.events)
    };
    // Process groups if present
    if (genConfig.groups && genConfig.groups.length > 0) {
        sources.groups = genConfig.groups.map(groupFile => readSchemaSource(groupFile));
    }
    // Process dimensions if present
    if (genConfig.dimensions && genConfig.dimensions.length > 0) {
        sources.dimensions = genConfig.dimensions.map(dimensionFile => readSchemaSource(dimensionFile));
    }
    // Process meta if present
    if (genConfig.meta) {
        sources.meta = readSchemaSource(genConfig.meta);
    }
    // Create config without output for hashing
    const { output } = genConfig, configWithoutOutput = __rest(genConfig, ["output"]);
    // Create hash for this generation entry
    const entryContent = {
        config: configWithoutOutput,
        sources
    };
    const entryHash = createContentHash(entryContent);
    // Determine version using semantic versioning
    let version = '1.0';
    if (existingEntry) {
        if (existingEntry.hash === entryHash) {
            // No changes, keep existing version (convert to string format if needed)
            const { major, minor } = parseVersion(existingEntry.version);
            version = createVersion(major, minor);
        }
        else {
            // Changes detected, increment minor version
            const { major, minor } = parseVersion(existingEntry.version);
            version = createVersion(major, minor + 1);
        }
    }
    return {
        output: genConfig.output,
        config: configWithoutOutput,
        sources,
        hash: entryHash,
        version
    };
}
exports.processGenerationConfig = processGenerationConfig;
/**
 * Generates the complete voltage.lock file
 */
function generateLockFile(generationConfigs) {
    const existingLockFile = readExistingLockFile();
    const voltageSchemaVersion = getVoltageSchemaVersion();
    // Process each generation config
    const generates = generationConfigs.map(genConfig => {
        // Find existing entry by output path for version comparison
        const existingEntry = existingLockFile === null || existingLockFile === void 0 ? void 0 : existingLockFile.generates.find(entry => entry.output === genConfig.output);
        return processGenerationConfig(genConfig, existingEntry);
    });
    // Create overall lock file content
    const lockFileContent = {
        voltageSchemaVersion,
        configFile: 'voltage.config.js',
        generates
    };
    // Create hash for overall lock file
    const lockFileHash = createContentHash(lockFileContent);
    // Determine overall version based on highest generation entry version change
    let version = '1.0';
    if (existingLockFile) {
        if (existingLockFile.hash === lockFileHash) {
            // No changes, keep existing version (convert to string format if needed)
            const { major, minor } = parseVersion(existingLockFile.version);
            version = createVersion(major, minor);
        }
        else {
            // Changes detected, increment minor version
            const { major: currentMajor, minor: currentMinor } = parseVersion(existingLockFile.version);
            version = createVersion(currentMajor, currentMinor + 1);
        }
    }
    return Object.assign(Object.assign({}, lockFileContent), { version, hash: lockFileHash });
}
exports.generateLockFile = generateLockFile;
/**
 * Writes the lock file to disk (minified)
 */
function writeLockFile(lockFile) {
    const lockFilePath = path_1.default.resolve(process.cwd(), 'voltage.lock');
    const content = JSON.stringify(lockFile, null, 0); // Minified JSON
    fs_1.default.writeFileSync(lockFilePath, content, 'utf8');
}
exports.writeLockFile = writeLockFile;
