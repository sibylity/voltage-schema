import fs from "fs";
import path from "path";
import crypto from "crypto";
import { parseSchemaFile } from "../validation/fileValidation";
import { GenerationConfig } from "../../types";

// Lock file data structure types
export interface VoltageSchemaSource {
  file: string;
  data: any;
  hash: string;
}

export interface VoltageGenerationEntry {
  output: string;
  config: Omit<GenerationConfig, 'output'>;
  sources: {
    events: VoltageSchemaSource;
    groups?: VoltageSchemaSource[];
    dimensions?: VoltageSchemaSource[];
    meta?: VoltageSchemaSource;
  };
  hash: string;
  version: string | number; // Support both for backward compatibility
}

export interface VoltageLockFile {
  voltageSchemaVersion: string;
  version: string | number; // Support both for backward compatibility
  hash: string;
  configFile: string;
  generates: VoltageGenerationEntry[];
}

/**
 * Parses a version (string or number) into major and minor components
 * Handles migration from old integer versions to new semver format
 */
export function parseVersion(version: string | number): { major: number; minor: number } {
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

/**
 * Creates a version string from major and minor numbers
 */
export function createVersion(major: number, minor: number): string {
  return `${major}.${minor}`;
}

// Note: Breaking change detection can be added later if needed
// For now, we'll keep it simple and treat all changes as minor version bumps

/**
 * Creates a deterministic hash for any object
 */
export function createContentHash(content: any): string {
  // Create a deep deterministic JSON string with sorted keys at all levels
  const normalizedContent = JSON.stringify(content, (key, value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Sort object keys for deterministic output
      const sorted: any = {};
      Object.keys(value).sort().forEach(k => {
        sorted[k] = value[k];
      });
      return sorted;
    }
    return value;
  });
  return crypto.createHash('sha256').update(normalizedContent).digest('hex').substring(0, 16);
}

/**
 * Reads and processes a schema file, returning source data with hash
 */
export function readSchemaSource(filePath: string): VoltageSchemaSource {
  const absolutePath = path.resolve(process.cwd(), filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Schema file not found: ${filePath}`);
  }

  const result = parseSchemaFile(absolutePath);
  if (!result.isValid || !result.data) {
    const errorMessage = result.errors ? result.errors.join(', ') : 'Unknown parsing error';
    throw new Error(`Failed to parse schema file ${filePath}: ${errorMessage}`);
  }

  return {
    file: filePath, // Store relative path
    data: result.data,
    hash: createContentHash(result.data)
  };
}

/**
 * Gets the voltage-schema package version
 */
export function getVoltageSchemaVersion(): string {
  try {
    const packageJsonPath = path.resolve(__dirname, '../../../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    return packageJson.version;
  } catch (error) {
    // Fallback if we can't read the package.json
    return '0.0.0';
  }
}

/**
 * Reads the existing lock file if it exists
 */
export function readExistingLockFile(): VoltageLockFile | null {
  const lockFilePath = path.resolve(process.cwd(), 'voltage.lock');

  if (!fs.existsSync(lockFilePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(lockFilePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    // If we can't parse the existing lock file, treat it as if it doesn't exist
    return null;
  }
}

/**
 * Processes a generation config and returns the generation entry
 */
export function processGenerationConfig(
  genConfig: GenerationConfig,
  existingEntry?: VoltageGenerationEntry
): VoltageGenerationEntry {
  let sources: VoltageGenerationEntry['sources'];

  if (genConfig.mergedSchemaFile) {
    // For merged schema files, read the single file as events source
    sources = {
      events: readSchemaSource(genConfig.mergedSchemaFile)
    };
  } else {
    // For separate files, read events file
    if (!genConfig.events) {
      throw new Error('Generation config must have either events or mergedSchemaFile');
    }
    sources = {
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
  }

  // Create config without output for hashing
  const { output, ...configWithoutOutput } = genConfig;

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
    } else {
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

/**
 * Generates the complete voltage.lock file
 */
export function generateLockFile(generationConfigs: GenerationConfig[]): VoltageLockFile {
  const existingLockFile = readExistingLockFile();
  const voltageSchemaVersion = getVoltageSchemaVersion();

  // Process each generation config
  const generates = generationConfigs.map(genConfig => {
    // Find existing entry by output path for version comparison
    const existingEntry = existingLockFile?.generates.find(entry => entry.output === genConfig.output);
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
    } else {
      // Changes detected, increment minor version
      const { major: currentMajor, minor: currentMinor } = parseVersion(existingLockFile.version);
      version = createVersion(currentMajor, currentMinor + 1);
    }
  }

  return {
    ...lockFileContent,
    version,
    hash: lockFileHash
  };
}

/**
 * Writes the lock file to disk (minified)
 */
export function writeLockFile(lockFile: VoltageLockFile): void {
  const lockFilePath = path.resolve(process.cwd(), 'voltage.lock');
  const content = JSON.stringify(lockFile, null, 0); // Minified JSON
  fs.writeFileSync(lockFilePath, content, 'utf8');
}
