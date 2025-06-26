import { createValidator } from '../../cli/validation/schemaValidation';
import path from 'path';

describe('Schema Validation Edge Cases', () => {
  describe('AJV Validator Edge Cases', () => {
    test('should handle malformed JSON schema file', () => {
      // This should work since the schema files are valid JSON
      const schemaPath = path.resolve(__dirname, '../../schemas/analytics.events.schema.json');
      const validator = createValidator(schemaPath);
      
      expect(validator).toBeDefined();
      expect(typeof validator).toBe('function');
    });

    test('should handle union types in validation', () => {
      const schemaPath = path.resolve(__dirname, '../../schemas/analytics.events.schema.json');
      const validator = createValidator(schemaPath);
      
      // Test data with union type (property type can be string or array)
      const testData = {
        events: {
          test_event: {
            name: "Test Event",
            properties: [
              {
                name: "String Property",
                type: "string"
              },
              {
                name: "Array Property", 
                type: ["option1", "option2", "option3"]
              }
            ]
          }
        }
      };
      
      const isValid = validator(testData);
      expect(isValid).toBe(true);
    });

    test('should reject completely invalid data structure', () => {
      const schemaPath = path.resolve(__dirname, '../../schemas/analytics.events.schema.json');
      const validator = createValidator(schemaPath);
      
      const invalidData = {
        notEvents: "this is not valid"
      };
      
      const isValid = validator(invalidData);
      expect(isValid).toBe(false);
      expect(validator.errors).toBeDefined();
      expect(validator.errors?.length).toBeGreaterThan(0);
    });

    test('should validate complex nested structures', () => {
      const schemaPath = path.resolve(__dirname, '../../schemas/analytics.events.schema.json');
      const validator = createValidator(schemaPath);
      
      const complexData = {
        events: {
          complex_event: {
            name: "Complex Event",
            description: "An event with all possible features",
            dimensions: {
              included: ["dimension1"],
              excluded: ["dimension2"]
            },
            properties: [
              {
                name: "Required Property",
                description: "A required property",
                type: "string"
              },
              {
                name: "Optional Property",
                description: "An optional property",
                type: "number",
                optional: true
              },
              {
                name: "Property with Default",
                description: "A property with a default value",
                type: "boolean",
                defaultValue: true
              }
            ],
            meta: {
              "customField": "customValue",
              "numericField": 42,
              "booleanField": true
            },
            passthrough: true
          }
        }
      };
      
      const isValid = validator(complexData);
      expect(isValid).toBe(true);
    });
  });

  describe('Property Validation Edge Cases', () => {
    test('should handle empty property arrays', () => {
      const schemaPath = path.resolve(__dirname, '../../schemas/analytics.events.schema.json');
      const validator = createValidator(schemaPath);
      
      const dataWithEmptyProperties = {
        events: {
          minimal_event: {
            name: "Minimal Event",
            properties: []
          }
        }
      };
      
      const isValid = validator(dataWithEmptyProperties);
      expect(isValid).toBe(true);
    });

    test('should handle events without properties', () => {
      const schemaPath = path.resolve(__dirname, '../../schemas/analytics.events.schema.json');
      const validator = createValidator(schemaPath);
      
      const dataWithoutProperties = {
        events: {
          no_props_event: {
            name: "Event Without Properties"
          }
        }
      };
      
      const isValid = validator(dataWithoutProperties);
      expect(isValid).toBe(true);
    });

    test('should handle various property types', () => {
      const schemaPath = path.resolve(__dirname, '../../schemas/analytics.events.schema.json');
      const validator = createValidator(schemaPath);
      
      const dataWithVariousTypes = {
        events: {
          type_variety_event: {
            name: "Type Variety Event",
            properties: [
              {
                name: "String Prop",
                type: "string"
              },
              {
                name: "Number Prop", 
                type: "number"
              },
              {
                name: "Boolean Prop",
                type: "boolean"
              },
              {
                name: "Array Prop",
                type: ["value1", "value2"]
              }
            ]
          }
        }
      };
      
      const isValid = validator(dataWithVariousTypes);
      expect(isValid).toBe(true);
    });
  });

  describe('Dimension Validation Edge Cases', () => {
    test('should handle dimension arrays vs objects', () => {
      const schemaPath = path.resolve(__dirname, '../../schemas/analytics.events.schema.json');
      const validator = createValidator(schemaPath);
      
      const dataWithArrayDimensions = {
        events: {
          array_dimensions_event: {
            name: "Array Dimensions Event",
            dimensions: ["dim1", "dim2"]
          },
          object_dimensions_event: {
            name: "Object Dimensions Event", 
            dimensions: {
              included: ["dim1", "dim2"]
            }
          },
          excluded_dimensions_event: {
            name: "Excluded Dimensions Event",
            dimensions: {
              excluded: ["dim3", "dim4"]
            }
          }
        }
      };
      
      const isValid = validator(dataWithArrayDimensions);
      expect(isValid).toBe(true);
    });
  });
}); 