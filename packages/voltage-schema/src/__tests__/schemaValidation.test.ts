import { createValidator } from '../cli/validation/schemaValidation';
import { validateEvents } from '../cli/validation/validateAnalyticsEvents';
import { validateGroups } from '../cli/validation/validateAnalyticsGroups';
import { validateDimensions } from '../cli/validation/validateAnalyticsDimensions';
import { validateMeta } from '../cli/validation/validateAnalyticsMeta';
import { validateAnalyticsConfig } from '../cli/validation/validateAnalyticsConfig';
import {
  validEventsSchema,
  validGroupsSchema,
  validDimensionsSchema,
  validMetaSchema,
  validConfigSchema
} from './fixtures/validSchemas';
import {
  invalidEventsSchema,
  invalidGroupsSchema,
  invalidDimensionsSchema,
  invalidMetaSchema,
  invalidConfigSchema
} from './fixtures/invalidSchemas';
import path from 'path';
import fs from 'fs';
import { tmpdir } from 'os';

describe('Schema Validation Integration Tests', () => {
  let tempDir: string;
  let eventsPath: string;
  let groupsPath: string;
  let dimensionsPath: string;
  let metaPath: string;
  let configPath: string;

  beforeAll(() => {
    // Create temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(tmpdir(), 'voltage-test-'));
    eventsPath = path.join(tempDir, 'events.json');
    groupsPath = path.join(tempDir, 'groups.json');
    dimensionsPath = path.join(tempDir, 'dimensions.json');
    metaPath = path.join(tempDir, 'meta.json');
    configPath = path.join(tempDir, 'voltage.config.json');
  });

  afterAll(() => {
    // Clean up temporary files
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  });

  describe('Valid Schema Validation', () => {
    beforeEach(() => {
      // Write valid schemas to temp files
      fs.writeFileSync(eventsPath, JSON.stringify(validEventsSchema, null, 2));
      fs.writeFileSync(groupsPath, JSON.stringify(validGroupsSchema, null, 2));
      fs.writeFileSync(dimensionsPath, JSON.stringify(validDimensionsSchema, null, 2));
      fs.writeFileSync(metaPath, JSON.stringify(validMetaSchema, null, 2));
      fs.writeFileSync(configPath, JSON.stringify(validConfigSchema, null, 2));
    });

    test('should validate valid events schema', () => {
      const dimensionNames = ['Free', 'Paid', 'Trial'];
      const metaRules = validMetaSchema.meta;
      
      const result = validateEvents(eventsPath, dimensionNames, true, metaRules);
      
      expect(result.isValid).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.events).toBeDefined();
      expect(Object.keys(result.data?.events || {})).toContain('page_view');
      expect(Object.keys(result.data?.events || {})).toContain('user_signup');
      expect(Object.keys(result.data?.events || {})).toContain('message_sent');
    });

    test('should validate valid groups schema', () => {
      const result = validateGroups(groupsPath, eventsPath);
      
      expect(result.isValid).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.groups).toBeDefined();
      expect(result.data?.groups).toHaveLength(2);
      expect(result.data?.groups?.[0].name).toBe('User');
      expect(result.data?.groups?.[1].name).toBe('Team');
    });

    test('should validate valid dimensions schema', () => {
      const result = validateDimensions(dimensionsPath, eventsPath);
      
      expect(result.isValid).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.dimensions).toBeDefined();
      expect(result.data?.dimensions).toHaveLength(3);
      expect(result.data?.dimensions?.map(d => d.name)).toEqual(['Free', 'Paid', 'Trial']);
    });

    test('should validate valid meta schema', () => {
      const result = validateMeta(metaPath);
      
      expect(result.isValid).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.meta).toBeDefined();
      expect(result.data?.meta).toHaveLength(3);
      expect(result.data?.meta?.[0].name).toBe('Source');
    });

    test('should validate valid config schema', () => {
      const result = validateAnalyticsConfig(configPath, { filePath: configPath });
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toBeUndefined();
    });
  });

  describe('Invalid Schema Validation', () => {
    test('should reject events schema missing required name field', () => {
      fs.writeFileSync(eventsPath, JSON.stringify(invalidEventsSchema, null, 2));
      
      const result = validateEvents(eventsPath, ['Free', 'Paid'], true, []);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });

    test('should reject events with duplicate property names', () => {
      const schemaWithDuplicateProps = {
        events: {
          test_event: {
            name: "Test Event",
            description: "Event with duplicate properties",
            properties: [
              { name: "Duplicate", type: "string" },
              { name: "Duplicate", type: "number" }
            ]
          }
        }
      };
      
      fs.writeFileSync(eventsPath, JSON.stringify(schemaWithDuplicateProps, null, 2));
      
      const result = validateEvents(eventsPath, [], true, []);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.some(error => error.includes('Duplicate property name'))).toBe(true);
    });

    test('should reject events with non-existent dimensions', () => {
      const schemaWithBadDimensions = {
        events: {
          test_event: {
            name: "Test Event",
            description: "Event with invalid dimensions",
            dimensions: {
              included: ["NonExistentDimension"]
            },
            properties: []
          }
        }
      };
      
      fs.writeFileSync(eventsPath, JSON.stringify(schemaWithBadDimensions, null, 2));
      
      const result = validateEvents(eventsPath, ['Free', 'Paid'], true, []);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.some(error => error.includes('does not exist'))).toBe(true);
    });

    test('should reject events with unknown meta fields', () => {
      const schemaWithBadMeta = {
        events: {
          test_event: {
            name: "Test Event",
            description: "Event with invalid meta",
            meta: {
              "UnknownField": "value"
            },
            properties: []
          }
        }
      };
      
      const metaRules = [
        {
          name: "Source",
          description: "Event source",
          type: ["web", "mobile"],
          optional: false
        }
      ];
      
      fs.writeFileSync(eventsPath, JSON.stringify(schemaWithBadMeta, null, 2));
      
      const result = validateEvents(eventsPath, [], true, metaRules);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.some(error => error.includes('Unknown meta field'))).toBe(true);
    });

    test('should reject invalid config schema', () => {
      fs.writeFileSync(configPath, JSON.stringify(invalidConfigSchema, null, 2));
      
      const result = validateAnalyticsConfig(configPath, { filePath: configPath });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('JSON Schema Validator', () => {
    test('should create validator from schema file', () => {
      const schemaPath = path.resolve(__dirname, '../schemas/analytics.events.schema.json');
      const validator = createValidator(schemaPath);
      
      expect(validator).toBeDefined();
      expect(typeof validator).toBe('function');
      
      // Test with valid data
      const isValid = validator(validEventsSchema);
      expect(isValid).toBe(true);
      
      // Test with invalid data
      const isInvalid = validator({ invalid: "data" });
      expect(isInvalid).toBe(false);
      expect(validator.errors).toBeDefined();
    });
  });

  describe('Cross-Reference Validation', () => {
    test('should validate events with proper dimension references', () => {
      // Set up valid files with events that don't require meta validation
      const eventsWithoutMeta = {
        events: {
          simple_event: {
            name: "Simple Event",
            dimensions: {
              included: ["Free", "Paid"]
            },
            properties: [
              {
                name: "Event Property",
                type: "string"
              }
            ]
          }
        }
      };
      
      fs.writeFileSync(eventsPath, JSON.stringify(eventsWithoutMeta, null, 2));
      fs.writeFileSync(dimensionsPath, JSON.stringify(validDimensionsSchema, null, 2));
      
      const dimensionNames = validDimensionsSchema.dimensions.map(d => d.name);
      const result = validateEvents(eventsPath, dimensionNames, true, []);
      
      expect(result.isValid).toBe(true);
    });

    test('should reject events referencing invalid dimensions', () => {
      const eventsWithBadDimensions = {
        events: {
          test_event: {
            name: "Test Event",
            dimensions: {
              included: ["InvalidDimension"]
            },
            properties: []
          }
        }
      };
      
      fs.writeFileSync(eventsPath, JSON.stringify(eventsWithBadDimensions, null, 2));
      
      const dimensionNames = ['Free', 'Paid'];
      const result = validateEvents(eventsPath, dimensionNames, true, []);
      
      expect(result.isValid).toBe(false);
      expect(result.errors?.some(error => error.includes('does not exist'))).toBe(true);
    });
  });
}); 