import { validateAnalyticsFiles } from "../validation";

export function validate() {
  const isValid = validateAnalyticsFiles();
  if (!isValid) {
    console.error('Validation failed');
    process.exit(1);
  }
  console.log('Validation passed!');
}
