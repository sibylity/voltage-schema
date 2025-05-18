import { getAllProperties } from "../utils/analyticsPropertyUtils";

export function runPropertiesCommand(options: { verbose?: boolean }) {
  try {
    const properties = getAllProperties({ verbose: options.verbose });
    console.log(JSON.stringify(properties, null, 2));
  } catch (error) {
    console.error("❌ Error processing properties:", error);
    process.exit(1);
  }
}
