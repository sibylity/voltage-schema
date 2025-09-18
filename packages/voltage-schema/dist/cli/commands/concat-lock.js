"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerConcatLockCommand = exports.concatLockCommand = exports.writeMonorepoLockFile = exports.createMonorepoLockFile = exports.readExistingMonorepoLockFile = exports.getPackageInfo = exports.findVoltageLockFiles = exports.validateMonorepoRoot = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const lockFileGenerator_1 = require("../utils/lockFileGenerator");
/**
 * Validates that the command is being run from a monorepo root
 */
function validateMonorepoRoot(rootDir) {
    const packageJsonPath = path_1.default.join(rootDir, 'package.json');
    if (!fs_1.default.existsSync(packageJsonPath)) {
        throw new Error('No package.json found in current directory. The concat-lock command must be run from the monorepo root.');
    }
    try {
        const packageJson = JSON.parse(fs_1.default.readFileSync(packageJsonPath, 'utf8'));
        // Optional: Check for workspaces field to confirm it's a monorepo
        // This is just for informational purposes, not required
        if (packageJson.workspaces) {
            console.log('📦 Detected monorepo with workspaces configuration');
        }
    }
    catch (error) {
        throw new Error('Invalid package.json in current directory');
    }
}
exports.validateMonorepoRoot = validateMonorepoRoot;
/**
 * Scans a directory recursively for voltage.lock files
 * Ensures each voltage.lock has an associated package.json
 */
function findVoltageLockFiles(rootDir) {
    const lockFiles = [];
    function scanDirectory(dir) {
        try {
            const entries = fs_1.default.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path_1.default.join(dir, entry.name);
                if (entry.isDirectory()) {
                    // Skip node_modules and hidden directories
                    if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
                        scanDirectory(fullPath);
                    }
                }
                else if (entry.isFile() && entry.name === 'voltage.lock') {
                    // Skip the root monorepo voltage.lock file
                    if (dir === rootDir) {
                        continue;
                    }
                    // Check if package.json exists alongside voltage.lock
                    const packageJsonPath = path_1.default.join(dir, 'package.json');
                    if (!fs_1.default.existsSync(packageJsonPath)) {
                        throw new Error(`Found voltage.lock at ${fullPath} but no package.json in the same directory. Each voltage.lock must be in a package root with a package.json.`);
                    }
                    lockFiles.push(fullPath);
                }
            }
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('voltage.lock')) {
                throw error; // Re-throw voltage.lock validation errors
            }
            // Skip directories we can't read
        }
    }
    scanDirectory(rootDir);
    return lockFiles;
}
exports.findVoltageLockFiles = findVoltageLockFiles;
/**
 * Reads package.json for a given voltage.lock file to get package info
 * This function assumes package.json exists (validated by findVoltageLockFiles)
 */
function getPackageInfo(lockFilePath) {
    const packageDir = path_1.default.dirname(lockFilePath);
    const packageJsonPath = path_1.default.join(packageDir, 'package.json');
    try {
        const packageJson = JSON.parse(fs_1.default.readFileSync(packageJsonPath, 'utf8'));
        return {
            name: packageJson.name || path_1.default.basename(packageDir),
            version: packageJson.version || '0.0.0'
        };
    }
    catch (error) {
        throw new Error(`Could not read package.json at ${packageJsonPath}: ${error}`);
    }
}
exports.getPackageInfo = getPackageInfo;
/**
 * Reads existing monorepo lock file if it exists
 */
function readExistingMonorepoLockFile(outputPath) {
    if (!fs_1.default.existsSync(outputPath)) {
        return null;
    }
    try {
        const content = fs_1.default.readFileSync(outputPath, 'utf8');
        const lockFile = JSON.parse(content);
        // Validate it's a monorepo lock file
        if (lockFile.isMonoRepo === true && Array.isArray(lockFile.packages)) {
            return lockFile;
        }
        return null;
    }
    catch (error) {
        // If we can't parse the existing file, treat it as if it doesn't exist
        return null;
    }
}
exports.readExistingMonorepoLockFile = readExistingMonorepoLockFile;
/**
 * Creates a concatenated monorepo lock file from individual package lock files
 */
function createMonorepoLockFile(rootDir, existingMonorepoLock) {
    const lockFilePaths = findVoltageLockFiles(rootDir);
    if (lockFilePaths.length === 0) {
        throw new Error('No voltage.lock files found in the monorepo');
    }
    const packages = [];
    let highestSchemaVersion = '0.0.0';
    for (const lockFilePath of lockFilePaths) {
        try {
            // Read the lock file
            const lockFileContent = fs_1.default.readFileSync(lockFilePath, 'utf8');
            const lockData = JSON.parse(lockFileContent);
            // Get package info
            const packageInfo = getPackageInfo(lockFilePath);
            // Calculate relative path from root
            const relativePath = path_1.default.relative(rootDir, lockFilePath);
            // Track highest schema version
            if (lockData.voltageSchemaVersion > highestSchemaVersion) {
                highestSchemaVersion = lockData.voltageSchemaVersion;
            }
            packages.push({
                packageName: packageInfo.name,
                packageVersion: packageInfo.version,
                file: relativePath,
                data: lockData
            });
        }
        catch (error) {
            throw new Error(`Could not process voltage.lock file at ${lockFilePath}: ${error}`);
        }
    }
    if (packages.length === 0) {
        throw new Error('No valid voltage.lock files could be processed');
    }
    // Sort packages by name for deterministic output
    packages.sort((a, b) => a.packageName.localeCompare(b.packageName));
    // Create the monorepo lock file (without version and hash initially)
    const monorepoLockContent = {
        voltageSchemaVersion: highestSchemaVersion,
        isMonoRepo: true,
        packages
    };
    // Generate hash for the content
    const contentHash = (0, lockFileGenerator_1.createContentHash)(monorepoLockContent);
    // Determine version based on existing monorepo lock file
    let version = '1.0';
    if (existingMonorepoLock) {
        if (existingMonorepoLock.hash === contentHash) {
            // No changes, keep existing version
            const { major, minor } = (0, lockFileGenerator_1.parseVersion)(existingMonorepoLock.version);
            version = (0, lockFileGenerator_1.createVersion)(major, minor);
        }
        else {
            // Changes detected, increment minor version
            const { major, minor } = (0, lockFileGenerator_1.parseVersion)(existingMonorepoLock.version);
            version = (0, lockFileGenerator_1.createVersion)(major, minor + 1);
        }
    }
    return Object.assign(Object.assign({}, monorepoLockContent), { version, hash: contentHash });
}
exports.createMonorepoLockFile = createMonorepoLockFile;
/**
 * Writes the monorepo lock file to disk
 */
function writeMonorepoLockFile(monorepoLock, outputPath) {
    const content = JSON.stringify(monorepoLock, null, 0); // Minified JSON
    fs_1.default.writeFileSync(outputPath, content, 'utf8');
}
exports.writeMonorepoLockFile = writeMonorepoLockFile;
/**
 * Main concat-lock command implementation
 */
function concatLockCommand() {
    const rootDir = process.cwd();
    const outputPath = path_1.default.join(rootDir, 'voltage.lock'); // Always output to monorepo root
    console.log('🔍 Validating monorepo root...');
    try {
        // Validate we're in a monorepo root
        validateMonorepoRoot(rootDir);
        console.log('🔍 Scanning for voltage.lock files in monorepo...');
        // Read existing monorepo lock file for deterministic versioning
        const existingMonorepoLock = readExistingMonorepoLockFile(outputPath);
        // Create new monorepo lock file
        const monorepoLock = createMonorepoLockFile(rootDir, existingMonorepoLock);
        // Check if anything actually changed
        if (existingMonorepoLock && existingMonorepoLock.hash === monorepoLock.hash) {
            console.log('✅ No changes detected in package voltage.lock files');
            console.log(`📄 Monorepo voltage.lock is up to date (version ${monorepoLock.version})`);
            return;
        }
        console.log(`✅ Found ${monorepoLock.packages.length} package(s) with voltage.lock files:`);
        for (const pkg of monorepoLock.packages) {
            console.log(`   - ${pkg.packageName}@${pkg.packageVersion} (${pkg.file})`);
        }
        writeMonorepoLockFile(monorepoLock, outputPath);
        const action = existingMonorepoLock ? 'Updated' : 'Generated';
        console.log(`✅ ${action} monorepo voltage.lock (version ${monorepoLock.version})`);
    }
    catch (error) {
        console.error(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        process.exit(1);
    }
}
exports.concatLockCommand = concatLockCommand;
/**
 * Register the concat-lock command with the CLI
 */
function registerConcatLockCommand(cli) {
    cli
        .command('concat-lock', 'Concatenate multiple voltage.lock files from packages in a monorepo')
        .action(() => {
        concatLockCommand();
    });
}
exports.registerConcatLockCommand = registerConcatLockCommand;
