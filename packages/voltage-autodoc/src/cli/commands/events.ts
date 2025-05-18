import { getAllEvents } from "../utils/analyticsEventUtils";

export function runEventsCommand(options: { includeGroups?: boolean; includeDimensions?: boolean; verbose?: boolean }) {
  try {
    const events = getAllEvents({
      includeGroups: options.includeGroups,
      includeDimensions: options.includeDimensions,
      verbose: options.verbose
    });
    console.log(JSON.stringify(events, null, 2));
  } catch (error) {
    console.error("❌ Error processing events:", error);
    process.exit(1);
  }
}
