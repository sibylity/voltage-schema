import { CLI } from "../cli";
import { validateAnalyticsFiles } from "../validation";
import { generateAutodocHtml } from "../utils/autodocUtils";

export function registerAutodocCommand(cli: CLI) {
  cli
    .command("autodoc", "Generate HTML documentation for your analytics schema")
    .option("--output-html", "Output HTML documentation")
    .action((options: Record<string, boolean>) => {
      try {
        console.log("🔍 Running validation before generating autodoc...");
        if (!validateAnalyticsFiles()) {
          process.exit(1);
        }

        if (options["output-html"]) {
          const html = generateAutodocHtml();
          console.log(html);
        } else {
          console.log("📚 Autodoc server functionality is coming soon. For now, please use the --output-html option to generate HTML documentation.");
        }
      } catch (error) {
        console.error("❌ Error generating autodoc:", error);
        process.exit(1);
      }
    });
}
