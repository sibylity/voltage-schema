import fs from "fs";
import Ajv from "ajv";

export function createValidator(schemaPath: string) {
  const ajv = new Ajv({
    allowUnionTypes: true // Allow union types to suppress strict mode warnings
  });
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  return ajv.compile(schema);
} 