"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Command = void 0;
const child_process_1 = require("child_process");
const http = __importStar(require("http"));
const autodoc_1 = require("./autodoc");
function executeVoltageCommand(command) {
    const cwd = process.cwd();
    try {
        // First try npx voltage
        (0, child_process_1.execSync)(`npx voltage ${command}`, {
            stdio: ['inherit', 'pipe', 'inherit'],
            cwd
        });
    }
    catch (error) {
        try {
            // Fallback to direct node_modules access
            (0, child_process_1.execSync)(`node node_modules/voltage-schema/dist/cli/index.js ${command}`, {
                stdio: ['inherit', 'pipe', 'inherit'],
                cwd
            });
        }
        catch (fallbackError) {
            throw new Error(`Failed to execute voltage command "${command}". Make sure voltage-schema is installed as a dependency.\nOriginal error: ${error}\nFallback error: ${fallbackError}`);
        }
    }
}
function openBrowser(url) {
    const start = process.platform === 'darwin' ? 'open' :
        process.platform === 'win32' ? 'start' : 'xdg-open';
    (0, child_process_1.spawn)(start, [url], { detached: true, stdio: 'ignore' }).unref();
}
function startServer(html, port) {
    const server = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
    });
    server.listen(port, 'localhost', () => {
        const url = `http://localhost:${port}`;
        console.log(`📚 Autodoc server started at ${url}`);
        console.log('🌐 Opening browser...');
        openBrowser(url);
        console.log('Press Ctrl+C to stop the server');
    });
    // Handle server shutdown gracefully
    process.on('SIGINT', () => {
        console.log('\n👋 Shutting down autodoc server...');
        server.close(() => {
            process.exit(0);
        });
    });
}
class Command {
    showHelp() {
        console.log(`
Usage: voltage-autodoc [options]

Options:
  --output-html    Output HTML documentation to stdout
  --port <number>  Port to serve the documentation (default: 5555)
  --help, -h       Show this help message

Examples:
  voltage-autodoc                    # Start server on http://localhost:5555
  voltage-autodoc --port 3000       # Start server on http://localhost:3000
  voltage-autodoc --output-html      # Output HTML to stdout
  voltage-autodoc --output-html > docs.html
`);
    }
    parse(argv) {
        const args = argv.slice(2);
        if (args.includes("--help") || args.includes("-h")) {
            this.showHelp();
            return;
        }
        // Parse port argument
        let port = 5555; // default port
        const portIndex = args.indexOf("--port");
        if (portIndex !== -1 && portIndex + 1 < args.length) {
            const portValue = parseInt(args[portIndex + 1], 10);
            if (isNaN(portValue) || portValue < 1 || portValue > 65535) {
                console.error("❌ Invalid port number. Please provide a port between 1 and 65535.");
                process.exit(1);
            }
            port = portValue;
        }
        try {
            console.log("🔍 Running validation via voltage-schema...");
            // Validate the schema first
            executeVoltageCommand("validate");
            console.log("📚 Generating autodoc HTML...");
            const html = (0, autodoc_1.generateAutodocHtml)();
            if (args.includes("--output-html")) {
                // Output to stdout
                console.log(html);
            }
            else {
                // Start server
                startServer(html, port);
            }
        }
        catch (error) {
            console.error("❌ Error generating autodoc:", error);
            process.exit(1);
        }
    }
}
exports.Command = Command;
//# sourceMappingURL=command.js.map