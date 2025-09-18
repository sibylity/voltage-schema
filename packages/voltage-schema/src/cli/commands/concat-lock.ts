import fs from 'fs';
import path from 'path';
import { VoltageLockFile, createContentHash, createVersion, parseVersion } from '../utils/lockFileGenerator';
import { CLI } from '../cli';

export interface MonorepoPackage {
  packageName: string;
  packageVersion: string;
  file: string; // relative path to voltage.lock
  data: VoltageLockFile;
}

export interface MonorepoLockFile {
  hash: string;
  voltageSchemaVersion: string;
  version: string;
  isMonoRepo: true;
  packages: MonorepoPackage[];
}

/**
 * Validates that the command is being run from a monorepo root
 */
export function validateMonorepoRoot(rootDir: string): void {
  const packageJsonPath = path.join(rootDir, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    throw new Error('No package.json found in current directory. The concat-lock command must be run from the monorepo root.');
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    // Optional: Check for workspaces field to confirm it's a monorepo
    // This is just for informational purposes, not required
    if (packageJson.workspaces) {
      console.log('📦 Detected monorepo with workspaces configuration');
    }
  } catch (error) {
    throw new Error('Invalid package.json in current directory');
  }
}

/**
 * Scans a directory recursively for voltage.lock files
 * Ensures each voltage.lock has an associated package.json
 */
export function findVoltageLockFiles(rootDir: string): string[] {
  const lockFiles: string[] = [];

  function scanDirectory(dir: string) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // Skip node_modules and hidden directories
          if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
            scanDirectory(fullPath);
          }
        } else if (entry.isFile() && entry.name === 'voltage.lock') {
          // Skip the root monorepo voltage.lock file
          if (dir === rootDir) {
            continue;
          }

          // Check if package.json exists alongside voltage.lock
          const packageJsonPath = path.join(dir, 'package.json');
          if (!fs.existsSync(packageJsonPath)) {
            throw new Error(`Found voltage.lock at ${fullPath} but no package.json in the same directory. Each voltage.lock must be in a package root with a package.json.`);
          }
          lockFiles.push(fullPath);
        }
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('voltage.lock')) {
        throw error; // Re-throw voltage.lock validation errors
      }
      // Skip directories we can't read
    }
  }

  scanDirectory(rootDir);
  return lockFiles;
}

/**
 * Reads package.json for a given voltage.lock file to get package info
 * This function assumes package.json exists (validated by findVoltageLockFiles)
 */
export function getPackageInfo(lockFilePath: string): { name: string; version: string } {
  const packageDir = path.dirname(lockFilePath);
  const packageJsonPath = path.join(packageDir, 'package.json');

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    return {
      name: packageJson.name || path.basename(packageDir),
      version: packageJson.version || '0.0.0'
    };
  } catch (error) {
    throw new Error(`Could not read package.json at ${packageJsonPath}: ${error}`);
  }
}

/**
 * Reads existing monorepo lock file if it exists
 */
export function readExistingMonorepoLockFile(outputPath: string): MonorepoLockFile | null {
  if (!fs.existsSync(outputPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(outputPath, 'utf8');
    const lockFile = JSON.parse(content);

    // Validate it's a monorepo lock file
    if (lockFile.isMonoRepo === true && Array.isArray(lockFile.packages)) {
      return lockFile as MonorepoLockFile;
    }

    return null;
  } catch (error) {
    // If we can't parse the existing file, treat it as if it doesn't exist
    return null;
  }
}

/**
 * Creates a concatenated monorepo lock file from individual package lock files
 */
export function createMonorepoLockFile(rootDir: string, existingMonorepoLock?: MonorepoLockFile | null): MonorepoLockFile {
  const lockFilePaths = findVoltageLockFiles(rootDir);

  if (lockFilePaths.length === 0) {
    throw new Error('No voltage.lock files found in the monorepo');
  }

  const packages: MonorepoPackage[] = [];
  let highestSchemaVersion = '0.0.0';

  for (const lockFilePath of lockFilePaths) {
    try {
      // Read the lock file
      const lockFileContent = fs.readFileSync(lockFilePath, 'utf8');
      const lockData: VoltageLockFile = JSON.parse(lockFileContent);

      // Get package info
      const packageInfo = getPackageInfo(lockFilePath);

      // Calculate relative path from root
      const relativePath = path.relative(rootDir, lockFilePath);

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

    } catch (error) {
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
    isMonoRepo: true as const,
    packages
  };

  // Generate hash for the content
  const contentHash = createContentHash(monorepoLockContent);

  // Determine version based on existing monorepo lock file
  let version = '1.0';
  if (existingMonorepoLock) {
    if (existingMonorepoLock.hash === contentHash) {
      // No changes, keep existing version
      const { major, minor } = parseVersion(existingMonorepoLock.version);
      version = createVersion(major, minor);
    } else {
      // Changes detected, increment minor version
      const { major, minor } = parseVersion(existingMonorepoLock.version);
      version = createVersion(major, minor + 1);
    }
  }

  return {
    ...monorepoLockContent,
    version,
    hash: contentHash
  };
}

/**
 * Writes the monorepo lock file to disk
 */
export function writeMonorepoLockFile(monorepoLock: MonorepoLockFile, outputPath: string): void {
  const content = JSON.stringify(monorepoLock, null, 0); // Minified JSON
  fs.writeFileSync(outputPath, content, 'utf8');
}

/**
 * Main concat-lock command implementation
 */
export function concatLockCommand(): void {
  const rootDir = process.cwd();
  const outputPath = path.join(rootDir, 'voltage.lock'); // Always output to monorepo root

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

  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

/**
 * Register the concat-lock command with the CLI
 */
export function registerConcatLockCommand(cli: CLI) {
  cli
    .command('concat-lock', 'Concatenate multiple voltage.lock files from packages in a monorepo')
    .action(() => {
      concatLockCommand();
    });
}
