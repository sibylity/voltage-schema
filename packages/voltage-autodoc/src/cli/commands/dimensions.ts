import { getAllDimensions } from "../utils/analyticsDimensionUtils";

export function runDimensionsCommand(options: { includeEventDetails?: boolean; verbose?: boolean }) {
  try {
    const dimensions = getAllDimensions({
      includeEventDetails: options.includeEventDetails,
      verbose: options.verbose
    });
    console.log(JSON.stringify(dimensions, null, 2));
  } catch (error) {
    console.error("❌ Error listing dimensions:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
