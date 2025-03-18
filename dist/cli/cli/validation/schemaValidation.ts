import fs from "fs";
import Ajv from "ajv";

export function createValidator(schemaPath: string) {
  const ajv = new Ajv();
  const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
  return ajv.compile(schema);
} 