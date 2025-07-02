import { execSync } from "child_process";

interface AnalyticsEvent {
  key: string;
  name: string;
  description: string;
  properties: Array<{
    name: string;
    type: string | string[];
    optional?: boolean;
    defaultValue?: any;
    source?: string;
    groupName?: string;
  }>;
  dimensions?: Array<{
    name: string;
    description: string;
    identifiers: any;
  }>;
  meta?: Record<string, any>;
  passthrough?: boolean;
}

interface AnalyticsProperty {
  property: string;
  types: (string | string[])[];
  sources: Array<{
    type: string;
    name: string;
    description: string;
  }>;
}

interface AnalyticsDimension {
  dimension: string;
  description: string;
  events: string[];
  identifiers: any;
  eventDetails: Array<{
    key: string;
    name: string;
    description: string;
  }>;
}

interface AnalyticsConfig {
  generates: Array<{
    events: string;
    groups?: string[];
    dimensions?: string[];
    meta?: string;
    output: string;
  }>;
}

function extractJsonFromOutput(output: string): string {
  // Find the first '[' or '{' character which should be the start of JSON
  const lines = output.split('\n');
  let jsonStartIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('[') || line.startsWith('{')) {
      jsonStartIndex = i;
      break;
    }
  }

  if (jsonStartIndex === -1) {
    throw new Error('No JSON found in output');
  }

  return lines.slice(jsonStartIndex).join('\n');
}

function executeVoltageCommand(command: string): string {
  const cwd = process.cwd();

  try {
    // First try npx voltage
    return execSync(`npx voltage ${command}`, { encoding: 'utf8', cwd });
  } catch (error) {
    try {
      // Fallback to direct node_modules access
      return execSync(`node node_modules/voltage-schema/dist/cli/index.js ${command}`, { encoding: 'utf8', cwd });
    } catch (fallbackError) {
      throw new Error(`Failed to execute voltage command "${command}". Make sure voltage-schema is installed as a dependency.\nOriginal error: ${error}\nFallback error: ${fallbackError}`);
    }
  }
}

function getDataFromCLI(): {
  events: AnalyticsEvent[];
  properties: AnalyticsProperty[];
  dimensions: AnalyticsDimension[];
  config: AnalyticsConfig;
} {
  try {
    // Get events data
    const eventsOutput = executeVoltageCommand("events --verbose");
    const events = JSON.parse(extractJsonFromOutput(eventsOutput));

    // Get properties data
    const propertiesOutput = executeVoltageCommand("properties --verbose");
    const properties = JSON.parse(extractJsonFromOutput(propertiesOutput));

    // Get dimensions data
    const dimensionsOutput = executeVoltageCommand("dimensions --verbose");
    const dimensions = JSON.parse(extractJsonFromOutput(dimensionsOutput));

    // Read config file directly (simpler than adding a CLI command for this)
    const fs = require('fs');
    const path = require('path');
    const configPath = path.resolve(process.cwd(), 'voltage.config.js');
    let config: AnalyticsConfig;

    if (fs.existsSync(configPath)) {
      delete require.cache[require.resolve(configPath)];
      config = require(configPath).default || require(configPath);
    } else {
      const jsConfigPath = path.resolve(process.cwd(), 'voltage.config.js');
      config = JSON.parse(fs.readFileSync(jsConfigPath, 'utf8'));
    }

    return { events, properties, dimensions, config };
  } catch (error) {
    throw new Error(`Failed to get data from voltage-schema CLI: ${error}`);
  }
}

export function generateAutodocHtml(): string {
  const { events, properties, dimensions, config } = getDataFromCLI();

  // Generate schema config sections from analytics.config.json
  const schemaConfigSections = config.generates.map((genConfig, index) => `
    <div class="schema-config collapsed" id="config-${index}">
      <div class="schema-config-header" onclick="toggleConfig(${index})">
        <div class="schema-config-title">Schema Config ${index + 1}</div>
        <div class="schema-config-toggle">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </div>
      <div class="schema-config-content">
        <div class="schema-group">
          <div class="schema-group-title">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M3 3h10v2H3zM3 7h7v2H3zM3 11h4v2H3z" fill="currentColor"/>
            </svg>
            Input Events
          </div>
          <div class="file-path" data-tooltip="${genConfig.events}">
            <input type="text" value="${genConfig.events}" readonly>
          </div>
        </div>
        <div class="schema-group">
          <div class="schema-group-title">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M3 3h10v2H3zM3 7h7v2H3zM3 11h4v2H3z" fill="currentColor"/>
            </svg>
            Input Groups
          </div>
          ${genConfig.groups ? genConfig.groups.map(groupFile => `
            <div class="file-path" data-tooltip="${groupFile}">
              <input type="text" value="${groupFile}" readonly>
            </div>
          `).join('') : '<div class="file-path">No groups configured</div>'}
        </div>
        <div class="schema-group">
          <div class="schema-group-title">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M3 3h10v2H3zM3 7h7v2H3zM3 11h4v2H3z" fill="currentColor"/>
            </svg>
            Input Dimensions
          </div>
          ${genConfig.dimensions ? genConfig.dimensions.map(dimensionFile => `
            <div class="file-path" data-tooltip="${dimensionFile}">
              <input type="text" value="${dimensionFile}" readonly>
            </div>
          `).join('') : '<div class="file-path">No dimensions configured</div>'}
        </div>
        <div class="schema-group">
          <div class="schema-group-title">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M8 2v12m4-4l-4 4m-4-4l4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Generated Output
          </div>
          <div class="file-path" data-tooltip="${genConfig.output}">
            <input type="text" value="${genConfig.output}" readonly>
          </div>
        </div>
      </div>
    </div>
  `).join('');

  return `
     <!DOCTYPE html>
     <html>
       <head>
         <title>Voltage | Analytics Taxonomy</title>
         <meta name="viewport" content="width=device-width; initial-scale=1.0">
         <style>
           :root {
             --primary-color: #6366f1;
             --primary-light: #818cf8;
             --border-color: #e5e7eb;
             --text-primary: #111827;
             --text-secondary: #6b7280;
             --bg-hover: #f9fafb;
             --bg-secondary: #f3f4f6;
             --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
             --shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
           }

           * {
             box-sizing: border-box;
             margin: 0;
             padding: 0;
           }

           body {
             font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
             color: var(--text-primary);
             line-height: 1.5;
             padding: 0;
             margin: 0;
             background: var(--bg-secondary);
             display: flex;
           }

           .sidebar {
             width: 280px;
             background: #1a1a1a;
             color: #ffffff;
             border-right: 1px solid rgba(255, 255, 255, 0.1);
             height: 100vh;
             position: fixed;
             left: 0;
             top: 0;
             padding: 1.5rem;
             display: flex;
             flex-direction: column;
             gap: 2rem;
             overflow-y: auto;
           }

           .main-content {
             flex: 1;
             margin-left: 280px;
             padding: 0;
             min-height: 100vh;
           }

           .logo {
             display: flex;
             align-items: center;
             gap: 0.5rem;
             font-size: 1.25rem;
             font-weight: 600;
             color: #ffffff;
           }

           .logo img {
             height: 40px;
             width: auto;
           }

           .external-link {
             display: flex;
             align-items: center;
             gap: 0.5rem;
             padding: 0.75rem 1rem;
             border-radius: 0.5rem;
             color: rgba(255, 255, 255, 0.9);
             font-size: 0.875rem;
             font-weight: 500;
             text-decoration: none;
             background: rgba(255, 255, 255, 0.1);
             transition: all 0.15s ease;
           }

           .external-link:hover {
             background: rgba(255, 255, 255, 0.15);
             color: #ffffff;
           }

           .info-callout {
             padding: 1rem;
             background: rgba(255, 255, 255, 0.1);
             border-radius: 0.5rem;
             border: 1px solid rgba(255, 255, 255, 0.1);
             overflow: visible;
           }

           .info-callout-title {
             display: flex;
             align-items: center;
             gap: 0.5rem;
             font-weight: 600;
             font-size: 0.875rem;
             margin-bottom: 0.75rem;
             color: #ffffff;
           }

           .info-callout-content {
             font-size: 0.8125rem;
             color: rgba(255, 255, 255, 0.8);
             line-height: 1.5;
           }

           .schema-config {
             margin-bottom: 1rem;
             background: rgba(0, 0, 0, 0.2);
             border-radius: 0.5rem;
             border: 1px solid rgba(255, 255, 255, 0.05);
             overflow: visible;
           }

           .schema-config:last-child {
             margin-bottom: 0;
           }

           .schema-config-header {
             padding: 0.75rem 1rem;
             display: flex;
             align-items: center;
             gap: 0.75rem;
             cursor: pointer;
             user-select: none;
             transition: all 0.15s ease;
           }

           .schema-config-header:hover {
             background: rgba(255, 255, 255, 0.05);
           }

           .schema-config-title {
             font-size: 0.75rem;
             text-transform: uppercase;
             letter-spacing: 0.05em;
             color: rgba(255, 255, 255, 0.7);
             font-weight: 600;
             flex: 1;
           }

           .schema-config-toggle svg {
             transition: transform 0.2s ease;
           }

           .schema-config.collapsed .schema-config-toggle svg {
             transform: rotate(-90deg);
           }

           .schema-config-content {
             padding: 0.75rem 1rem;
             border-top: 1px solid rgba(255, 255, 255, 0.05);
             display: flex;
             flex-direction: column;
             gap: 1rem;
           }

           .schema-config.collapsed .schema-config-content {
             display: none;
           }

           .schema-group-title {
             display: flex;
             align-items: center;
             gap: 0.5rem;
             font-size: 0.75rem;
             color: rgba(255, 255, 255, 0.6);
             margin-bottom: 0.5rem;
           }

           .file-path {
             display: flex;
             align-items: center;
             margin-top: 0.5rem;
             position: relative;
           }

           .file-path input {
             font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
             font-size: 0.75rem;
             padding: 0.375rem 0.75rem;
             background: rgba(0, 0, 0, 0.3);
             border-radius: 0.25rem;
             color: rgba(255, 255, 255, 0.9);
             border: 1px solid rgba(255, 255, 255, 0.1);
             width: 100%;
             white-space: nowrap;
             overflow: hidden;
             text-overflow: ellipsis;
             transition: all 0.15s ease;
             cursor: text;
             outline: none;
           }

           .file-path input:hover {
             border-color: rgba(255, 255, 255, 0.2);
           }

           .file-path input:focus {
             border-color: var(--primary-color);
           }

           [data-tooltip] {
             position: relative;
           }

           [data-tooltip]:hover::after {
             content: attr(data-tooltip);
             position: absolute;
             bottom: calc(100% + 5px);
             left: 50%;
             transform: translateX(-50%);
             padding: 0.5rem;
             background: rgba(0, 0, 0, 0.8);
             color: white;
             border-radius: 0.25rem;
             font-size: 0.75rem;
             white-space: nowrap;
             z-index: 10;
           }

           /* Special tooltip positioning for schema file inputs */
           .file-path[data-tooltip]:hover::after {
             bottom: calc(100% + 8px);
             left: 0;
             right: 0;
             transform: none;
             z-index: 1000;
             white-space: normal;
             word-wrap: break-word;
             max-width: none;
             width: auto;
           }

           .header {
             border-bottom: 1px solid var(--border-color);
             padding: 1.25rem 2rem;
             background: white;
             position: sticky;
             top: 0;
             z-index: 10;
             box-shadow: var(--shadow-sm);
           }

           .header h1 {
             font-size: 1.25rem;
             font-weight: 600;
           }

           .header-content {
             max-width: 1200px;
             margin: 0 auto;
             display: grid;
             grid-template-columns: auto auto 1fr;
             align-items: center;
             gap: 2rem;
           }

           .mobile-menu-button {
             display: none;
             background: none;
             border: none;
             color: var(--text-primary);
             cursor: pointer;
             padding: 0.5rem;
             border-radius: 0.5rem;
             transition: background-color 0.15s ease;
           }

           .mobile-menu-button:hover {
             background: var(--bg-hover);
           }

           .header-top-row {
             display: none;
           }

           .mobile-overlay {
             display: none;
             position: fixed;
             top: 0;
             left: 0;
             width: 100%;
             height: 100%;
             background: rgba(0, 0, 0, 0.5);
             z-index: 999;
           }

           @media (max-width: 960px) {
             .mobile-overlay.active {
               display: block;
             }
           }

           .header-title {
             font-size: 1.125rem;
             font-weight: 600;
             color: var(--text-primary);
           }

           .controls {
             display: flex;
             gap: 1rem;
             align-items: center;
             justify-content: flex-end;
           }

           .filter-bar {
             display: flex;
             gap: 0.75rem;
             align-items: center;
           }

           .toggle-group {
             display: flex;
             align-items: center;
             border: 1px solid var(--border-color);
             border-radius: 0.5rem;
             overflow: hidden;
             background: white;
             box-shadow: var(--shadow-sm);
             height: 40px;
           }

           .toggle-button {
             padding: 0.5rem 1rem;
             border: none;
             background: none;
             cursor: pointer;
             font-size: 0.875rem;
             display: flex;
             align-items: center;
             gap: 0.5rem;
             color: var(--text-secondary);
             transition: all 0.15s ease;
             height: 100%;
           }

           .toggle-button.active {
             background: var(--primary-color);
             color: white;
           }

           .toggle-button:not(.active):hover {
             background: var(--bg-hover);
             color: var(--text-primary);
           }

           .filter-select {
             padding: 0.5rem 1rem;
             padding-right: 2rem;
             border: 1px solid var(--border-color);
             border-radius: 0.5rem;
             font-size: 0.875rem;
             background: white;
             cursor: pointer;
             min-width: 160px;
             box-shadow: var(--shadow-sm);
             transition: border-color 0.15s ease;
             height: 40px;
             appearance: none;
             background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16' fill='none'%3E%3Cpath d='M4 6L8 10L12 6' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
             background-repeat: no-repeat;
             background-position: right 0.75rem center;
             background-size: 1rem;
           }

           .filter-select:hover {
             border-color: var(--primary-light);
           }

           .search-bar {
             display: flex;
             align-items: center;
             padding: 0.5rem 1rem;
             border: 1px solid var(--border-color);
             border-radius: 0.5rem;
             width: 300px;
             background: white;
             box-shadow: var(--shadow-sm);
             transition: all 0.15s ease;
             height: 40px;
             position: relative;
           }

           .search-bar:focus-within {
             border-color: var(--primary-light);
             box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
           }

           .search-bar input {
             border: none;
             outline: none;
             width: 100%;
             font-size: 0.875rem;
             background: transparent;
             padding-right: 2.5rem;
           }

           .search-clear {
             position: absolute;
             right: 0.5rem;
             top: 50%;
             transform: translateY(-50%);
             width: 2rem;
             height: 2rem;
             border: none;
             background: white;
             border-radius: 50%;
             cursor: pointer;
             display: flex;
             align-items: center;
             justify-content: center;
             color: var(--text-secondary);
             transition: all 0.15s ease;
             box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
           }

           .search-clear:hover {
             background: var(--bg-secondary);
             color: var(--text-primary);
           }

           .container {
             padding: 2rem;
           }

           .event-list {
             display: flex;
             flex-direction: column;
             gap: 0.75rem;
           }

           .event-row {
             border: 1px solid var(--border-color);
             border-radius: 0.75rem;
             background: white;
             overflow: hidden;
             box-shadow: var(--shadow-sm);
             transition: all 0.15s ease;
           }

           .event-row:hover {
             box-shadow: var(--shadow);
             border-color: var(--primary-light);
           }

           .event-summary {
             padding: 1.25rem;
             cursor: pointer;
             display: flex;
             align-items: center;
             gap: 1rem;
             justify-content: space-between;
             transition: background-color 0.15s ease;
           }

           .event-summary:hover {
             background: var(--bg-hover);
           }

           .event-summary-left {
             display: flex;
             align-items: center;
             gap: 1.5rem;
             flex: 1;
           }

           .event-basic-info {
             flex: 1;
           }

           .event-name {
             font-weight: 600;
             font-size: 1rem;
             color: var(--text-primary);
             margin-bottom: 0.25rem;
           }

           .event-key {
             font-size: 0.875rem;
             color: var(--text-secondary);
             font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
             word-break: break-word;
             overflow-wrap: break-word;
           }

           .event-dimensions {
             display: flex;
             gap: 0.5rem;
             flex-wrap: wrap;
           }

           .event-tag, .event-stat {
             font-size: 0.8rem;
             padding: 0.3rem 0.75rem;
             border-radius: 1rem;
             background: var(--bg-secondary);
             color: var(--text-secondary);
             transition: all 0.15s ease;
             cursor: pointer;
             user-select: none;
           }

           .event-tag:hover, .event-stat:hover {
             background: var(--primary-color);
             color: white;
           }

           .event-details {
             padding: 1.5rem;
             border-top: 1px solid var(--border-color);
             display: none;
             background: var(--bg-secondary);
           }

           .event-details.expanded {
             display: block;
           }

           .event-description {
             font-size: 0.875rem;
             color: var(--text-secondary);
             margin-bottom: 1.5rem;
             line-height: 1.6;
           }

           .section-title {
             font-size: 0.75rem;
             font-weight: 600;
             text-transform: uppercase;
             color: var(--text-secondary);
             margin-bottom: 0.75rem;
             letter-spacing: 0.05em;
           }

           .property-list {
             display: flex;
             flex-direction: column;
             gap: 0.75rem;
             margin-bottom: 1.5rem;
           }

           .property-list:last-child {
             margin-bottom: 0;
           }

           .property {
             font-size: 0.875rem;
             padding: 1.25rem;
             border-radius: 0.75rem;
             background: white;
             border: 1px solid var(--border-color);
             box-shadow: var(--shadow-sm);
             transition: all 0.15s ease;
           }

           .property:hover {
             border-color: var(--primary-light);
             box-shadow: var(--shadow);
           }

           .property-name {
             font-weight: 600;
             color: var(--text-primary);
             margin-bottom: 0.5rem;
             font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
             font-size: 0.9375rem;
           }

           .property-type {
             color: var(--text-secondary);
             font-size: 0.8125rem;
             margin-bottom: 0.5rem;
             margin-right: 0.25rem;
             padding: 0.25rem 0.75rem;
             background: var(--bg-secondary);
             border-radius: 1rem;
             display: inline-block;
           }

           .property-source {
             font-size: 0.75rem;
             color: var(--primary-color);
             font-weight: 500;
             margin-top: 0.5rem;
             display: inline-block;
             padding: 0.25rem 0.75rem;
             background: rgba(99, 102, 241, 0.1);
             border-radius: 1rem;
           }

           .property-description {
             margin-top: 0.75rem;
             color: var(--text-secondary);
             font-size: 0.875rem;
             line-height: 1.6;
             padding-top: 0.75rem;
             border-top: 1px solid var(--border-color);
           }

           .property-default {
             margin-top: 0.5rem;
             font-size: 0.8125rem;
             color: var(--text-secondary);
             padding: 0.25rem 0.75rem;
             background: var(--bg-secondary);
             border-radius: 1rem;
             display: inline-block;
           }

           .group {
             margin-bottom: 2.5rem;
           }

           .group:last-child {
             margin-bottom: 0;
           }

           .group-header {
             display: flex;
             align-items: center;
             margin-bottom: 1.25rem;
             padding: 0.75rem 1rem;
             background: white;
             border-radius: 0.5rem;
             border: 1px solid var(--border-color);
             box-shadow: var(--shadow-sm);
             cursor: pointer;
             transition: all 0.15s ease;
             user-select: none;
           }

           .group-header:hover {
             border-color: var(--primary-light);
             box-shadow: var(--shadow);
           }

           .group-header-content {
             display: flex;
             align-items: center;
             flex: 1;
           }

           .group-toggle {
             margin-left: auto;
             padding: 0.25rem;
             color: var(--text-secondary);
             transition: transform 0.2s ease;
           }

           .group.collapsed .group-toggle {
             transform: rotate(-90deg);
           }

           .group.collapsed .event-list {
             display: none;
           }

           .group.collapsed .group-header {
             margin-bottom: 0;
           }

           .group-name {
             font-weight: 600;
             font-size: 0.875rem;
             color: var(--text-primary);
             margin-right: 1rem;
           }

           .group-stats {
             color: var(--text-secondary);
             font-size: 0.75rem;
             background: var(--bg-secondary);
             padding: 0.25rem 0.75rem;
             border-radius: 1rem;
           }

           @media (min-width: 769px) and (max-width: 1300px) {
             .header-content {
               display: flex;
               flex-direction: column;
               gap: 1rem;
               align-items: stretch;
             }

             .header-content > .header-title {
               display: none;
             }

             .header-top-row {
               display: flex !important;
               justify-content: flex-start;
               align-items: center;
               width: 100%;
               gap: 2rem;
             }

             .header-top-row .header-title {
               text-align: left;
               margin: 0;
               flex: none;
             }

             .nav {
               order: 0;
               width: auto;
               justify-content: center;
               flex: none;
             }

             .controls {
               order: 2;
               width: 100%;
               justify-content: flex-start;
             }

             .filter-bar {
               flex-direction: column;
               gap: 1rem;
               width: 100%;
               align-items: flex-start;
             }

             #eventControls {
               flex-direction: row !important;
               gap: 1rem !important;
               width: auto;
               justify-content: flex-start;
             }

             .toggle-group {
               width: auto;
               justify-content: center;
             }

             .filter-select {
               width: auto;
               min-width: 200px;
             }

             .search-bar {
               width: 100%;
               max-width: 400px;
               margin: 0;
             }

             .mobile-menu-button {
               display: none;
             }
           }

           @media (max-width: 960px) {
             .mobile-menu-button {
               display: block;
             }

             .sidebar {
               transform: translateX(-100%);
               transition: transform 0.3s ease;
               z-index: 1000;
             }

             .sidebar.mobile-open {
               transform: translateX(0);
             }

             .main-content {
               margin-left: 0;
             }

             .header-content {
               display: flex;
               flex-direction: column;
               gap: 1rem;
               align-items: stretch;
             }

             .header-content > .header-title {
               display: none;
             }

             .header-top-row {
               display: flex !important;
               justify-content: space-between;
               align-items: center;
               width: 100%;
             }

             .header-top-row .header-title {
               text-align: left;
               margin: 0;
             }

             .mobile-menu-button {
               position: static;
               transform: none;
             }

             .nav {
               order: 1;
               width: 100%;
               justify-content: center;
             }

             .controls {
               order: 2;
               width: 100%;
               justify-content: center;
             }

             .filter-bar {
               flex-direction: column;
               gap: 1rem;
               width: 100%;
             }

             #eventControls {
               flex-direction: column !important;
               gap: 1rem !important;
               width: 100%;
             }

             .toggle-group {
               width: 100%;
               justify-content: center;
             }

             .filter-select {
               width: 100%;
             }

             .search-bar {
               width: 100%;
             }

             .header {
               padding: 1rem;
             }

             .container {
               padding: 1rem;
             }
           }



           .logo {
             display: flex;
             align-items: center;
             gap: 0.5rem;
             font-size: 1.25rem;
             font-weight: 600;
             color: #ffffff;
           }

           .logo svg {
             width: 1.5rem;
             height: 1.5rem;
             color: var(--primary-color);
           }

           .nav {
             display: flex;
             gap: 0.5rem;
             align-items: center;
             justify-content: center;
             background: var(--bg-secondary);
             padding: 0.25rem;
             border-radius: 0.75rem;
             width: fit-content;
           }

           .nav-item {
             padding: 0.5rem 1rem;
             border-radius: 0.5rem;
             font-size: 0.875rem;
             font-weight: 500;
             color: var(--text-secondary);
             cursor: pointer;
             transition: all 0.15s ease;
             border: none;
             background: none;
           }

           .nav-item:hover {
             color: var(--text-primary);
           }

           .nav-item.active {
             color: var(--text-primary);
             background: white;
             box-shadow: var(--shadow-sm);
           }

           .content {
             display: none;
             min-height: calc(100vh - 88px); /* Account for header height */
             opacity: 0;
             transition: opacity 0.15s ease;
           }

           .content.active {
             display: block;
             opacity: 1;
           }

           .content-header {
             padding: 2rem 0 0;
             color: var(--text-secondary);
             font-size: 0.875rem;
             font-weight: 500;
           }

           #propertyList, #dimensionList, #eventGroups {
             display: flex;
             flex-direction: column;
             gap: 0.75rem;
             padding: 2rem 0;
           }

           .event-implementation {
             margin: 0.75rem 0;
             border: 1px solid var(--border-color);
             border-radius: 0.5rem;
             background: white;
           }

           .event-implementation-header {
             padding: 1rem 1.25rem;
             cursor: pointer;
             display: flex;
             align-items: center;
             gap: 1.5rem;
             justify-content: space-between;
             transition: background-color 0.15s ease;
             border-radius: 0.5rem;
           }

           .event-implementation-header:hover {
             background: var(--bg-hover);
           }

           .event-implementation-left {
             display: flex;
             align-items: center;
             gap: 1.5rem;
             flex: 1;
           }

           .event-details {
             padding: 1.25rem;
             border-top: 1px solid var(--border-color);
             display: none;
             background: var(--bg-secondary);
           }

           .event-details.expanded {
             display: block;
           }

           .combined-properties {
             margin: 1.5rem 0;
           }

           .collapsible-section {
             margin: 1rem 0;
             border: 1px solid var(--border-color);
             border-radius: 0.5rem;
             background: white;
           }

           .collapsible-header {
             padding: 1rem 1.25rem;
             display: flex;
             align-items: center;
             justify-content: space-between;
             cursor: pointer;
             transition: background-color 0.15s ease;
           }

           .collapsible-header:hover {
             background: var(--bg-hover);
           }

           .collapsible-header > .section-title {
             margin-bottom: 0;
           }

           .collapsible-toggle {
             display: flex;
             align-items: center;
             color: var(--text-secondary);
           }

           .collapsible-toggle svg {
             transition: transform 0.2s ease;
           }

           .collapsible-section.expanded .collapsible-toggle svg {
             transform: rotate(180deg);
           }

           .collapsible-content {
             display: none;
             padding: 1.25rem;
             border-top: 1px solid var(--border-color);
             background: var(--bg-secondary);
           }

           .collapsible-section.expanded .collapsible-content {
             display: block;
           }

           .implementations-title, .properties-title {
             margin: 1.5rem 0 1rem;
           }

           .implementations-list {
             padding: 0 0.5rem;
           }

           .event-description {
             margin: 0 0 1.5rem 0;
             padding: 1.25rem;
             background: white;
             border: 1px solid var(--border-color);
             border-radius: 0.5rem;
           }

           .event-details-content {
             list-style-type: none;
             padding: 0;
             margin: 0;
           }

           .event-details-content li {
             margin: 0.5rem 0;
           }

           .section-title {
             font-size: 0.75rem;
             font-weight: 600;
             text-transform: uppercase;
             color: var(--text-secondary);
             letter-spacing: 0.05em;
           }

           .dimensions-card {
             padding: 1rem;
             background: white;
             border: 1px solid var(--border-color);
             border-radius: 0.5rem;
             margin-bottom: 1.5rem;
             display: flex;
             flex-wrap: wrap;
             gap: 0.5rem;
           }

           .dimension-tag {
             font-size: 0.7rem;
             padding: 0.25rem 0.6rem;
             border-radius: 0.75rem;
             cursor: pointer;
             transition: all 0.15s ease;
             user-select: none;
             font-weight: 500;
           }

           .dimension-tag-0 {
             background: #6366f1;
             color: white;
           }

           .dimension-tag-0:hover {
             background: #4f46e5;
             transform: translateY(-1px);
             box-shadow: var(--shadow);
           }

           .dimension-tag-1 {
             background: #10b981;
             color: white;
           }

           .dimension-tag-1:hover {
             background: #059669;
             transform: translateY(-1px);
             box-shadow: var(--shadow);
           }

           .dimension-tag-2 {
             background: #f59e0b;
             color: white;
           }

           .dimension-tag-2:hover {
             background: #d97706;
             transform: translateY(-1px);
             box-shadow: var(--shadow);
           }

           .dimension-tag-3 {
             background: #ef4444;
             color: white;
           }

           .dimension-tag-3:hover {
             background: #dc2626;
             transform: translateY(-1px);
             box-shadow: var(--shadow);
           }

           .dimension-tag-4 {
             background: #8b5cf6;
             color: white;
           }

           .dimension-tag-4:hover {
             background: #7c3aed;
             transform: translateY(-1px);
             box-shadow: var(--shadow);
           }

           .dimension-tag-5 {
             background: #06b6d4;
             color: white;
           }

           .dimension-tag-5:hover {
             background: #0891b2;
             transform: translateY(-1px);
             box-shadow: var(--shadow);
           }

           .dimension-tag-6 {
             background: #ec4899;
             color: white;
           }

           .dimension-tag-6:hover {
             background: #db2777;
             transform: translateY(-1px);
             box-shadow: var(--shadow);
           }

           .dimension-tag-7 {
             background: #84cc16;
             color: white;
           }

           .dimension-tag-7:hover {
             background: #65a30d;
             transform: translateY(-1px);
             box-shadow: var(--shadow);
           }

           .property {
             padding: 1.25rem;
           }

           .property-description {
             margin-top: 0.75rem;
             color: var(--text-secondary);
             font-size: 0.875rem;
             line-height: 1.6;
             padding-top: 0.75rem;
             border-top: 1px solid var(--border-color);
           }
         </style>
       </head>
       <body>
         <div class="mobile-overlay" onclick="closeMobileSidebar()"></div>
         <aside class="sidebar">
           <a class="logo" href="https://voltage-schema.com" target="_blank" rel="noopener">
             <img src="https://img.voltage-schema.com/voltage-logo-dark.png" alt="Voltage" />
           </a>

           <div class="info-callout">
             <div class="info-callout-title">
               <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                 <path d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zM8 11V8m0-3h.01" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
               </svg>
               Schema Files
             </div>
             <div class="info-callout-content">
               ${schemaConfigSections}
             </div>
           </div>
         </aside>

         <main class="main-content">
           <header class="header">
             <div class="header-content">
               <div class="header-top-row">
                 <div class="header-title">Taxonomy</div>
                 <button class="mobile-menu-button" onclick="toggleMobileSidebar()" aria-label="Toggle menu">
                   <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                     <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                   </svg>
                 </button>
               </div>
               <div class="header-title">Taxonomy</div>
               <nav class="nav">
                 <button class="nav-item active" onclick="showContent('events')">Events</button>
                 <button class="nav-item" onclick="showContent('properties')">Properties</button>
                 <button class="nav-item" onclick="showContent('dimensions')">Dimensions</button>
               </nav>
               <div class="controls">
                 <div class="filter-bar">
                   <div id="eventControls" style="display: flex; gap: 0.75rem; align-items: center;">
                     <div class="toggle-group">
                       <button class="toggle-button active" id="listAllButton" title="List All">
                         <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                           <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                         </svg>
                       </button>
                       <button class="toggle-button" id="groupByDimButton" title="Group by Dimension">
                         <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                           <path d="M1 4h4v4H1zM7 4h8v4H7zM1 10h4v4H1zM7 10h8v4H7z" />
                         </svg>
                       </button>
                     </div>
                     <select class="filter-select" id="dimensionFilter">
                       <option value="">All Dimensions</option>
                     </select>
                   </div>
                   <div class="search-bar">
                     <input type="text" placeholder="Search..." id="searchInput">
                     <button class="search-clear" id="searchClear" onclick="clearSearch()" style="display: none;">
                       <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                         <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                       </svg>
                     </button>
                   </div>
                 </div>
               </div>
             </div>
           </header>

           <main class="container">
             <div id="eventsContent" class="content active">
               <div class="content-header">
                 <span id="eventsCount"></span>
               </div>
               <div id="eventGroups"></div>
             </div>
             <div id="propertiesContent" class="content">
               <div class="content-header">
                 <span id="propertiesCount"></span>
               </div>
               <div id="propertyList"></div>
             </div>
             <div id="dimensionsContent" class="content">
               <div class="content-header">
                 <span id="dimensionsCount"></span>
               </div>
               <div id="dimensionList"></div>
             </div>
           </main>
         </main>

         <script>
           // Create consistent dimension color mapping
           function createDimensionColorMap(events) {
             const allDimensions = new Set();
             events.forEach(event => {
               event.dimensions?.forEach(d => allDimensions.add(d.name));
             });

             const dimensionColorMap = {};
             Array.from(allDimensions).sort().forEach((dimName, index) => {
               dimensionColorMap[dimName] = index % 8; // 8 different colors (0-7)
             });

             return dimensionColorMap;
           }

           // Initialize state with all data and URL parameters
           const urlParams = getUrlSearchParams();
           window.state = {
             events: ${JSON.stringify(events)},
             properties: ${JSON.stringify(properties)},
             dimensions: ${JSON.stringify(dimensions)},
             filters: {
               search: urlParams.search,
               dimension: '',
               activeFilters: new Set()
             },
             grouping: 'none',
             schemaFileCount: ${config.generates.length},
             dimensionColorMap: createDimensionColorMap(${JSON.stringify(events)})
           };

           // Initialize filters
           const dimensions = new Set();
           window.state.events.forEach(event => {
             event.dimensions?.forEach(d => dimensions.add(d.name));
           });

           const dimensionFilter = document.getElementById('dimensionFilter');
           Array.from(dimensions).sort().forEach(dim => {
             const option = document.createElement('option');
             option.value = String(dim);
             option.textContent = String(dim);
             dimensionFilter?.appendChild(option);
           });

           // URL parameter management
           function getUrlSearchParams() {
             const params = new URLSearchParams(window.location.search);
             return {
               search: params.get('search') || '',
               tab: params.get('tab') || 'events'
             };
           }

           function updateUrlSearchParams(params) {
             const url = new URL(window.location);
             if (params.search !== undefined) {
               if (params.search) {
                 url.searchParams.set('search', params.search);
               } else {
                 url.searchParams.delete('search');
               }
             }
             if (params.tab !== undefined) {
               if (params.tab && params.tab !== 'events') {
                 url.searchParams.set('tab', params.tab);
               } else {
                 url.searchParams.delete('tab');
               }
             }
             window.history.replaceState({}, '', url);
           }

           // Format property types to add spaces after commas for readability
           function formatPropertyType(type) {
             if (Array.isArray(type)) {
               // Handle arrays by joining with ", " (e.g., ["admin","member"] -> "admin, member")
               return type.join(', ');
             }
             return String(type);
           }

           // Deduplicate and format property types from multiple sources
           function formatCombinedPropertyTypes(types) {
             const allValues = new Set();

             types.forEach(type => {
               if (Array.isArray(type)) {
                 type.forEach(val => allValues.add(String(val)));
               } else {
                 allValues.add(String(type));
               }
             });

             return Array.from(allValues).sort().join(', ');
           }

           // Search clear functionality
           function updateSearchClearVisibility() {
             const searchClear = document.getElementById('searchClear');
             if (searchClear) {
               if (window.state.filters.search) {
                 searchClear.style.display = 'flex';
               } else {
                 searchClear.style.display = 'none';
               }
             }
           }

           window.clearSearch = function() {
             const searchInput = document.getElementById('searchInput');
             if (searchInput instanceof HTMLInputElement) {
               searchInput.value = '';
               window.state.filters.search = '';
               updateUrlSearchParams({ search: '' });
               updateSearchClearVisibility();

               const activeContent = document.querySelector('.content.active');
               if (activeContent?.id === 'eventsContent') {
                 window.filterAndRenderEvents();
               } else if (activeContent?.id === 'propertiesContent') {
                 renderProperties();
               } else if (activeContent?.id === 'dimensionsContent') {
                 renderDimensions();
               }
               updateCounts();
             }
           };

                      // Mobile sidebar toggle functionality
           window.toggleMobileSidebar = function() {
             const sidebar = document.querySelector('.sidebar');
             const overlay = document.querySelector('.mobile-overlay');
             if (sidebar && overlay) {
               const isOpen = sidebar.classList.contains('mobile-open');
               if (isOpen) {
                 sidebar.classList.remove('mobile-open');
                 overlay.classList.remove('active');
               } else {
                 sidebar.classList.add('mobile-open');
                 overlay.classList.add('active');
               }
             }
           };

           window.closeMobileSidebar = function() {
             const sidebar = document.querySelector('.sidebar');
             const overlay = document.querySelector('.mobile-overlay');
             if (sidebar && overlay) {
               sidebar.classList.remove('mobile-open');
               overlay.classList.remove('active');
             }
           };

           // Close mobile sidebar when clicking outside (for non-overlay clicks)
           document.addEventListener('click', function(e) {
             const sidebar = document.querySelector('.sidebar');
             const menuButton = document.querySelector('.mobile-menu-button');
             const overlay = document.querySelector('.mobile-overlay');

             if (sidebar && sidebar.classList.contains('mobile-open') &&
                 !sidebar.contains(e.target) && !menuButton.contains(e.target) && !overlay.contains(e.target)) {
               window.closeMobileSidebar();
             }
           });

           // Toggle config sections
           window.toggleConfig = function(index) {
             const config = document.getElementById('config-' + index);
             if (config) {
               config.classList.toggle('collapsed');
             }
           };

           function filterEvents(events) {
             return events.filter(event => {
               if (window.state.filters.search) {
               const eventProperties = event.properties || [];
                 const searchTerm = window.state.filters.search.toLowerCase();
                 const searchMatch =
                   event.name.toLowerCase().includes(searchTerm) ||
                   event.key.toLowerCase().includes(searchTerm) ||
                   event.description?.toLowerCase().includes(searchTerm) ||
                   eventProperties.some(p =>
                     p.name.toLowerCase().includes(searchTerm) ||
                     p.description?.toLowerCase().includes(searchTerm)
                   );
                 if (!searchMatch) return false;
               }

               if (window.state.filters.dimension) {
                 if (!event.dimensions?.some(d => d.name === window.state.filters.dimension)) {
                   return false;
                 }
               }

               return true;
             });
           }

           function filterProperties() {
             if (!window.state.filters.search) return window.state.properties;

             const searchTerm = window.state.filters.search.toLowerCase();
             return window.state.properties.filter(prop =>
               prop.property.toLowerCase().includes(searchTerm) ||
               prop.sources.some(source =>
                 source.name.toLowerCase().includes(searchTerm) ||
                 source.description?.toLowerCase().includes(searchTerm)
               )
             );
           }

           function filterDimensions() {
             if (!window.state.filters.search) return window.state.dimensions;

             const searchTerm = window.state.filters.search.toLowerCase();
             return window.state.dimensions.filter(dim =>
               dim.dimension.toLowerCase().includes(searchTerm) ||
               dim.description?.toLowerCase().includes(searchTerm) ||
               dim.events.some(event => event.toLowerCase().includes(searchTerm))
             );
           }

           function groupEventsByName(events) {
             const eventsByName = {};
             events.forEach(event => {
               if (!eventsByName[event.name]) {
                 eventsByName[event.name] = [];
               }
               eventsByName[event.name].push(event);
             });
             return eventsByName;
           }



           function renderProperties() {
             const container = document.getElementById('propertyList');
             if (!container) return;

             const filteredProperties = filterProperties();
             container.innerHTML = filteredProperties
               .map(prop => {
                 const sourcesHtml = prop.sources.map((source, sourceIndex) => {
                   const descriptionHtml = source.description
                     ? '<div class="property-description">' + source.description + '</div>'
                     : '';

                   // Create safe ID for this source
                   const sourceId = prop.property + '-source-' + sourceIndex;
                   const safeSourceId = sourceId.replace(/[^a-zA-Z0-9-]/g, '-');

                                      // Find full event objects for this source
                   const sourceEventObjects = (source.events || []).map(eventKey => {
                     return window.state.events.find(event => event.key === eventKey);
                   }).filter(event => event !== undefined);

                   const eventsHtml = sourceEventObjects.length > 0 ?
                     '<div class="collapsible-section">' +
                       '<div class="collapsible-header" onclick="toggleCollapsible(&quot;implementations-' + safeSourceId + '&quot;)">' +
                         '<div class="section-title">Implementations (' + sourceEventObjects.length + ')</div>' +
                         '<div class="collapsible-toggle">' +
                           '<svg width="16" height="16" viewBox="0 0 16 16" fill="none">' +
                             '<path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
                           '</svg>' +
                         '</div>' +
                       '</div>' +
                       '<div class="collapsible-content" id="implementations-' + safeSourceId + '">' +
                         '<div class="implementations-list">' +
                           sourceEventObjects.map(event => renderEventCard(event, 'property-' + prop.property, true)).join('') +
                         '</div>' +
                       '</div>' +
                     '</div>' : '';

                   return '<div class="property">' +
                     '<div class="property-name">' + source.name + '</div>' +
                     '<div class="property-type">' + formatPropertyType(source.type) + '</div>' +
                     descriptionHtml +
                     (source.defaultValue ? '<div class="property-default">Default: ' + source.defaultValue + '</div>' : '') +
                     eventsHtml +
                     '</div>';
                 }).join('');

                 return '<div class="event-row">' +
                   '<div class="event-summary" onclick="toggleDetails(&quot;' + prop.property + '&quot;)">' +
                     '<div class="event-summary-left">' +
                       '<div class="event-basic-info">' +
                         '<div class="event-name">' + prop.property + '</div>' +
                         '<div class="event-key">' + formatCombinedPropertyTypes(prop.types) + '</div>' +
                       '</div>' +
                     '</div>' +
                     '<div class="event-stat">' +
                       '<span>' + prop.sources.length + '</span>' +
                       '<span> sources</span>' +
                     '</div>' +
                   '</div>' +
                   '<div class="event-details" id="details-' + prop.property + '">' +
                     '<div class="section-title">Sources</div>' +
                     '<div class="property-list">' +
                       sourcesHtml +
                     '</div>' +
                   '</div>' +
                 '</div>';
               })
               .join('');

             updateCounts();
           }

           function renderDimensions() {
             const container = document.getElementById('dimensionList');
             if (!container) return;

             const filteredDimensions = filterDimensions();
             container.innerHTML = filteredDimensions
               .map(dim => {
                 // Only combine identifiers if they exist
                 const hasIdentifiers = dim.identifiers && (
                   (dim.identifiers.OR && dim.identifiers.OR.length > 0) ||
                   (dim.identifiers.AND && dim.identifiers.AND.length > 0)
                 );

                 const combinedIdentifiers = hasIdentifiers ?
                   [...(dim.identifiers.OR || []), ...(dim.identifiers.AND || [])] :
                   [];

                 const identifiersHtml = combinedIdentifiers.map(identifier => {
                   const entriesHtml = Object.entries(identifier)
                     .filter(([key]) => key !== 'property')
                     .map(([key, value]) =>
                       '<div class="property-type">' + key + ': ' + JSON.stringify(value) + '</div>'
                     ).join('');
                   return '<div class="property">' +
                     '<div class="property-name">' + identifier.property + '</div>' +
                     entriesHtml +
                     '</div>';
                 }).join('');

                 // Group events by name for event details
                 const eventDetailsHtml = dim.eventDetails ?
                   '<div class="section-title">Events</div>' +
                   '<div class="property-list">' +
                     Object.entries(groupEventsByName(dim.eventDetails))
                       .map(([eventName, events]) => renderEventGroup(eventName, events, dim.dimension, false))
                       .join('') +
                   '</div>' : '';

                 // Only render the Identifiers section if there are actual identifiers
                 const identifiersSectionHtml = hasIdentifiers
                   ? '<div class="section-title">Identifiers</div>' +
                     '<div class="property-list">' +
                       identifiersHtml +
                     '</div>'
                   : '';

                 const uniqueId = dim.dimension;
                 const safeId = uniqueId.replace(/[^a-zA-Z0-9-]/g, '-');

                 return '<div class="event-row">' +
                   '<div class="event-summary" onclick="toggleDetails(&quot;' + safeId + '&quot;)">' +
                     '<div class="event-summary-left">' +
                       '<div class="event-basic-info">' +
                         '<div class="event-name">' + dim.dimension + '</div>' +
                         '<div class="event-key">' + dim.description + '</div>' +
                       '</div>' +
                     '</div>' +
                     '<div class="event-stat" onclick="navigateToEventsWithDimension(event, &quot;' + dim.dimension + '&quot;)" title="View events with this dimension">' +
                       '<span>' + dim.events.length + '</span>' +
                       '<span> events</span>' +
                     '</div>' +
                   '</div>' +
                   '<div class="event-details" id="details-' + safeId + '">' +
                     identifiersSectionHtml +
                     eventDetailsHtml +
                   '</div>' +
                 '</div>';
               })
               .join('');

             updateCounts();
           }

           function renderEventCard(event, dimensionName, suppressProperties = false) {
             const eventProperties = event.properties ? event.properties.filter(p => p.source === 'event') : [];
             const groupProperties = event.properties ? event.properties.filter(p => p.source === 'group') : [];
             const allProperties = [...eventProperties, ...groupProperties];
             const uniqueId = dimensionName + '-' + event.key;
             const safeId = uniqueId.replace(/[^a-zA-Z0-9-]/g, '-');

             // Only render properties if not suppressed
             const eventPropertiesHtml = (!suppressProperties && eventProperties.length > 0) ?
               '<div class="section-title">Event Properties (' + (eventProperties.length || 0) + ')</div>' +
               '<div class="property-list">' +
                 eventProperties.map(prop => {
                   const descriptionHtml = prop.description
                     ? '<div class="property-description">' + prop.description + '</div>'
                     : '';
                   return '<div class="property">' +
                     '<div class="property-name">' + prop.name + '</div>' +
                     '<div class="property-type">' + formatPropertyType(prop.type) + '</div>' +
                     descriptionHtml +
                     (prop.defaultValue ? '<div class="property-default">Default: ' + prop.defaultValue + '</div>' : '') +
                     '</div>';
                 }).join('') +
               '</div>' : '';

             const groupPropertiesHtml = (!suppressProperties && groupProperties.length > 0) ?
               '<div class="section-title">Group Properties (' + (groupProperties.length || 0) + ')</div>' +
               '<div class="property-list">' +
                 groupProperties.map(prop => {
                   const descriptionHtml = prop.description
                     ? '<div class="property-description">' + prop.description + '</div>'
                     : '';
                   return '<div class="property">' +
                     '<div class="property-name">' + prop.name + '</div>' +
                     '<div class="property-type">' + formatPropertyType(prop.type) + '</div>' +
                     '<div class="property-source">From ' + prop.groupName + '</div>' +
                     descriptionHtml +
                     '</div>';
                 }).join('') +
               '</div>' : '';

             // --- Meta Fields Section ---
             let metaFieldsHtml = '';
             if (event.meta && typeof event.meta === 'object' && Object.keys(event.meta).length > 0) {
               metaFieldsHtml =
                 '<div class="section-title">Meta Fields (' + (Object.keys(event.meta).length || 0) + ')</div>' +
                 '<div class="property-list">' +
                   Object.entries(event.meta).map(([key, value]) => {
                     return '<div class="property">' +
                       '<div class="property-name">' + key + '</div>' +
                       '<div class="property-type">' + JSON.stringify(value) + '</div>' +
                       '</div>';
                   }).join('') +
                 '</div>';
             }
             // --- End Meta Fields Section ---

             const descriptionHtml = '<div>' +
              '<div class="section-title">Event Details</div>' +
              '<div class="event-description">' +
                '<ul class="event-details-content">' +
                  '<li><strong>Event:</strong> ' + event.name + '</li>' +
                  '<li><strong>Implementation Key:</strong> ' + event.key + '</li>' +
                  '<li><strong>Description:</strong> ' + (event.description || 'No description.') + '</li>' +
                '</ul>' +
              '</div>' +
             '</div>';

             // Show dimensions count instead of individual dimension tags
             const dimensionsCountHtml = event.dimensions && event.dimensions.length > 0
               ? '<span class="event-tag">' + event.dimensions.length + ' dimension' + (event.dimensions.length > 1 ? 's' : '') + '</span>'
               : '';

                          // Create dimensions card with individual clickable tags
             const dimensionsSectionHtml = event.dimensions && event.dimensions.length > 0 ?
               '<div>' +
                 '<div class="section-title">Dimensions (' + event.dimensions.length + ')</div>' +
                 '<div class="dimensions-card">' +
                   event.dimensions.map((dim) => {
                     const colorIndex = window.state.dimensionColorMap[dim.name] || 0;
                     return '<span class="dimension-tag dimension-tag-' + colorIndex + '" onclick="filterByDimension(&quot;' + dim.name + '&quot;)" title="' + (dim.description || 'Click to filter by this dimension') + '">' +
                       dim.name +
                       '</span>';
                   }).join('') +
                 '</div>' +
               '</div>' : '';

             return '<div class="event-implementation" data-event-key="' + event.key + '">' +
               '<div class="event-implementation-header" onclick="toggleImplementationDetails(&quot;' + safeId + '&quot;)">' +
                 '<div class="event-implementation-left">' +
                   '<div class="event-basic-info">' +
                     '<div class="event-key">' + event.key + '</div>' +
                   '</div>' +
                   '<div class="event-dimensions">' +
                     dimensionsCountHtml +
                   '</div>' +
                 '</div>' +
                 '<div class="event-stat">' +
                   '<span>' + (suppressProperties ? 0 : allProperties.length) + '</span>' +
                   '<span> properties</span>' +
                 '</div>' +
               '</div>' +
               '<div class="event-details" id="implementation-details-' + safeId + '">' +
                 descriptionHtml +
                 dimensionsSectionHtml +
                 eventPropertiesHtml +
                 groupPropertiesHtml +
                 metaFieldsHtml +
               '</div>' +
             '</div>';
           }

           function renderEventGroup(groupName, events, dimensionName, suppressProperties = false) {
             const allProperties = new Map();
             const allGroupProperties = new Map();
             const allDimensions = new Set();
             const uniqueId = dimensionName + '-' + groupName;
             const safeId = uniqueId.replace(/[^a-zA-Z0-9-]/g, '-');

             events.forEach(event => {
               // Track dimensions
               event.dimensions?.forEach(d => allDimensions.add(d.name));

               // Track properties
               const eventProperties = event.properties || [];
               eventProperties.forEach(prop => {
                 if (prop.source === 'event') {
                   if (!allProperties.has(prop.name)) {
                     allProperties.set(prop.name, prop);
                   }
                 } else if (prop.source === 'group') {
                   if (!allGroupProperties.has(prop.name)) {
                     allGroupProperties.set(prop.name, prop);
                   }
                 }
               });
             });

             // Only render combinedPropertiesHtml if not suppressed
             const combinedPropertiesHtml = (!suppressProperties && (allProperties.size > 0 || allGroupProperties.size > 0)) ?
               '<div class="combined-properties">' +
                 (allProperties.size > 0 ?
                   '<div class="collapsible-section">' +
                     '<div class="collapsible-header" onclick="toggleCollapsible(&quot;common-event-props-' + safeId + '&quot;)">' +
                       '<div class="section-title">Properties from Events (' + allProperties.size + ')</div>' +
                       '<div class="collapsible-toggle">' +
                         '<svg width="16" height="16" viewBox="0 0 16 16" fill="none">' +
                           '<path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
                         '</svg>' +
                       '</div>' +
                     '</div>' +
                     '<div class="collapsible-content" id="common-event-props-' + safeId + '">' +
                       '<div class="property-list">' +
                         Array.from(allProperties.values()).map(prop => {
                           const descriptionHtml = prop.description
                             ? '<div class="property-description">' + prop.description + '</div>'
                             : '';
                           return '<div class="property">' +
                             '<div class="property-name">' + prop.name + '</div>' +
                             '<div class="property-type">' + formatPropertyType(prop.type) + '</div>' +
                             descriptionHtml +
                             (prop.defaultValue ? '<div class="property-default">Default: ' + prop.defaultValue + '</div>' : '') +
                             '</div>';
                         }).join('') +
                       '</div>' +
                     '</div>' +
                   '</div>' : '') +
                 (allGroupProperties.size > 0 ?
                   '<div class="collapsible-section">' +
                     '<div class="collapsible-header" onclick="toggleCollapsible(&quot;common-group-props-' + safeId + '&quot;)">' +
                       '<div class="section-title">Properties from Groups (' + allGroupProperties.size + ')</div>' +
                       '<div class="collapsible-toggle">' +
                         '<svg width="16" height="16" viewBox="0 0 16 16" fill="none">' +
                           '<path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
                         '</svg>' +
                       '</div>' +
                     '</div>' +
                     '<div class="collapsible-content" id="common-group-props-' + safeId + '">' +
                       '<div class="property-list">' +
                         Array.from(allGroupProperties.values()).map(prop => {
                           const descriptionHtml = prop.description
                             ? '<div class="property-description">' + prop.description + '</div>'
                             : '';
                           return '<div class="property">' +
                             '<div class="property-name">' + prop.name + '</div>' +
                             '<div class="property-type">' + formatPropertyType(prop.type) + '</div>' +
                             '<div class="property-source">From ' + prop.groupName + '</div>' +
                             descriptionHtml +
                             '</div>';
                         }).join('') +
                       '</div>' +
                     '</div>' +
                   '</div>' : '') +
               '</div>' : '';

             const implementations = events.map(event => renderEventCard(event, dimensionName, suppressProperties)).join('');
             const totalProperties = suppressProperties ? 0 : new Set(
               events.flatMap(e => e.properties?.map(p => p.name) || [])
             ).size;

             // Show dimensions count for event groups instead of individual dimension tags
             const dimensionsCountForGroupHtml = allDimensions.size > 0
               ? '<span class="event-tag">' + allDimensions.size + ' dimension' + (allDimensions.size > 1 ? 's' : '') + '</span>'
               : '';

                                       // Create dimensions card with individual clickable tags for event groups
             const dimensionsSectionForGroupHtml = allDimensions.size > 0 ?
               '<div>' +
                 '<div class="section-title">Dimensions (' + allDimensions.size + ')</div>' +
                 '<div class="dimensions-card">' +
                   Array.from(allDimensions).map((dimName) => {
                     const colorIndex = window.state.dimensionColorMap[dimName] || 0;
                     return '<span class="dimension-tag dimension-tag-' + colorIndex + '" onclick="filterByDimension(&quot;' + dimName + '&quot;)" title="Click to filter by this dimension">' +
                       dimName +
                       '</span>';
                   }).join('') +
                 '</div>' +
               '</div>' : '';

             return '<div class="event-row" data-event-name="' + groupName + '">' +
               '<div class="event-summary" onclick="toggleEventDetails(&quot;' + safeId + '&quot;)">' +
                 '<div class="event-summary-left">' +
                   '<div class="event-basic-info">' +
                     '<div class="event-name">' + groupName + '</div>' +
                     '<div class="event-key">' + events.length + ' implementation' + (events.length > 1 ? 's' : '') + '</div>' +
                   '</div>' +
                   '<div class="event-dimensions">' +
                     dimensionsCountForGroupHtml +
                   '</div>' +
                 '</div>' +
                 '<div class="event-stat">' +
                   '<span>' + totalProperties + '</span>' +
                   '<span> properties</span>' +
                 '</div>' +
               '</div>' +
               '<div class="event-details" id="event-details-' + safeId + '">' +
                 dimensionsSectionForGroupHtml +
                 (suppressProperties ? '' : '<div class="section-title implementations-title">Properties (' + totalProperties + ')</div>' + combinedPropertiesHtml) +
                 '<div class="section-title implementations-title">Implementations (' + (events.length || 0) + ')</div>' +
                 '<div class="implementations-list">' +
                   implementations +
                 '</div>' +
               '</div>' +
             '</div>';
           }

           function filterByDimension(dimension) {
             const dimensionFilter = document.getElementById('dimensionFilter');
             if (dimensionFilter instanceof HTMLSelectElement) {
               dimensionFilter.value = dimension;
               window.state.filters.dimension = dimension;
               window.filterAndRenderEvents();
             }
           }

           // Navigate to events page with specific dimension selected
           window.navigateToEventsWithDimension = function(event, dimension) {
             if (event) {
               event.stopPropagation(); // Prevent the parent row click
             }

             // Switch to events tab
             window.showContent('events');

             // Set the dimension filter
             const dimensionFilter = document.getElementById('dimensionFilter');
             if (dimensionFilter instanceof HTMLSelectElement) {
               dimensionFilter.value = dimension;
               window.state.filters.dimension = dimension;
               window.filterAndRenderEvents();
             }
           };

           // Make functions available globally
           window.toggleDetails = function(key) {
             const details = document.getElementById('details-' + key);
             if (details) {
               details.classList.toggle('expanded');
             }
           };

           window.showContent = function(section) {
             // Update nav items
             document.querySelectorAll('.nav-item').forEach(item => {
               item.classList.remove('active');
               if (item.textContent.toLowerCase() === section) {
                 item.classList.add('active');
               }
             });

             // Update tab URL parameter
             updateUrlSearchParams({ tab: section });

             // Scroll to top before switching content
             window.scrollTo(0, 0);

             // Update content sections
             document.querySelectorAll('.content').forEach(content => {
               content.classList.remove('active');
             });
             document.getElementById(section + 'Content').classList.add('active');

                          // Update controls visibility - hide on non-events pages
             const eventControls = document.getElementById('eventControls');

             if (section === 'events') {
               // Show event controls
               if (eventControls) {
                 eventControls.style.display = 'flex';
               }
             } else {
               // Hide event controls on properties and dimensions pages
               if (eventControls) {
                 eventControls.style.display = 'none';
               }
             }

             // Clear search when switching sections
             const searchInput = document.getElementById('searchInput');
             if (searchInput instanceof HTMLInputElement) {
               searchInput.value = '';
               window.state.filters.search = '';
               updateUrlSearchParams({ search: '' });
               updateSearchClearVisibility();
             }

             // Render appropriate content
             if (section === 'events') {
               window.filterAndRenderEvents();
             } else if (section === 'properties') {
               renderProperties();
             } else if (section === 'dimensions') {
               renderDimensions();
             }

             // Update counts
             updateCounts();
           };

           function groupEvents(events) {
             if (window.state.grouping === 'none') {
               return { 'All Events': events };
             }

             // If filtering by dimension, only show that dimension group
             if (window.state.filters.dimension) {
               return {
                 [window.state.filters.dimension]: events.filter(event =>
                   event.dimensions?.some(d => d.name === window.state.filters.dimension)
                 )
               };
             }

             // Otherwise show all dimension groups
             const groups = {};
             events.forEach(event => {
               if (!event.dimensions || event.dimensions.length === 0) {
                 if (!groups['Ungrouped']) {
                   groups['Ungrouped'] = [];
                 }
                 groups['Ungrouped'].push(event);
               } else {
                 // Only add the event to the groups that match its dimensions
                 event.dimensions.forEach(d => {
                   if (!groups[d.name]) groups[d.name] = [];
                   groups[d.name].push(event);
                 });
               }
             });

             // Filter out empty groups
             Object.keys(groups).forEach(key => {
               if (groups[key].length === 0) {
                 delete groups[key];
               }
             });

             return groups;
           }

           window.filterAndRenderEvents = function() {
             const filteredEvents = filterEvents(window.state.events);
             const groupedEvents = groupEvents(filteredEvents);

             const container = document.getElementById('eventGroups');
             if (!container) return;

             // For each dimension group, group events by name, but only include events that have that dimension
             container.innerHTML = Object.entries(groupedEvents)
               .map(([groupName, groupEvents]) => {
                 // Group events by name, but only within this dimension group
                 const eventsByName = {};
                 groupEvents.forEach(event => {
                   // Only include the event if it has the current dimension
                   if (groupName === 'All Events' || groupName === 'Ungrouped' || event.dimensions?.some(d => d.name === groupName)) {
                     if (!eventsByName[event.name]) {
                       eventsByName[event.name] = [];
                     }
                     eventsByName[event.name].push(event);
                   }
                 });

                 const groupHeaderHtml = groupName !== 'All Events' ?
                   '<div class="group-header" onclick="toggleGroup(&quot;' + groupName + '&quot;)">' +
                     '<div class="group-header-content">' +
                       '<div class="group-name">' + groupName + '</div>' +
                       '<div class="group-stats">' +
                         Object.keys(eventsByName).length + ' unique events &bull; ' +
                         Object.values(eventsByName).flat().length + ' implementations' +
                       '</div>' +
                       '<div class="group-toggle">' +
                         '<svg width="16" height="16" viewBox="0 0 16 16" fill="none">' +
                           '<path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
                         '</svg>' +
                       '</div>' +
                     '</div>' +
                   '</div>' : '';

                 return '<section class="group" id="group-' + groupName + '">' +
                   groupHeaderHtml +
                   '<div class="event-list">' +
                     Object.entries(eventsByName)
                       .map(([eventName, events]) => renderEventGroup(eventName, events, groupName))
                       .join('') +
                   '</div>' +
                 '</section>';
               })
               .join('');

             // Update counts after rendering
             updateCounts();
           };

           window.toggleGroup = function(groupName) {
             const group = document.getElementById('group-' + groupName);
             if (group) {
               group.classList.toggle('collapsed');
             }
           };

           // Update the toggle functions in the script section
           window.toggleEventDetails = function(groupName) {
             const details = document.getElementById('event-details-' + groupName);
             if (details) {
               details.classList.toggle('expanded');
             }
           };

           window.toggleImplementationDetails = function(key, event) {
             if (event) {
              event.stopPropagation(); // Prevent event from bubbling up
             }
             const details = document.getElementById('implementation-details-' + key);
             if (details) {
               details.classList.toggle('expanded');
             }
           };

           // Set initial search input value from URL parameters
           const searchInput = document.getElementById('searchInput');
           if (searchInput instanceof HTMLInputElement && window.state.filters.search) {
             searchInput.value = window.state.filters.search;
           }
           // Update clear button visibility on initial load
           updateSearchClearVisibility();

           // Set initial tab from URL parameters
           const initialTab = urlParams.tab;
           if (initialTab && ['events', 'properties', 'dimensions'].includes(initialTab)) {
             // Don't trigger showContent as it would clear search - just update the UI
             document.querySelectorAll('.nav-item').forEach(item => {
               item.classList.remove('active');
               if (item.textContent.toLowerCase() === initialTab) {
                 item.classList.add('active');
               }
             });

             document.querySelectorAll('.content').forEach(content => {
               content.classList.remove('active');
             });
             document.getElementById(initialTab + 'Content').classList.add('active');

                          // Update controls visibility - hide on non-events pages
             const eventControls = document.getElementById('eventControls');

             if (initialTab === 'events') {
               // Show event controls
               if (eventControls) {
                 eventControls.style.display = 'flex';
               }
             } else {
               // Hide event controls on properties and dimensions pages
               if (eventControls) {
                 eventControls.style.display = 'none';
               }
             }

             // Render appropriate content
             if (initialTab === 'events') {
               window.filterAndRenderEvents();
             } else if (initialTab === 'properties') {
               renderProperties();
             } else if (initialTab === 'dimensions') {
               renderDimensions();
             }
           }

           // Event listeners
           document.getElementById('searchInput')?.addEventListener('input', (e) => {
             const target = e.currentTarget;
             if (target instanceof HTMLInputElement) {
               window.state.filters.search = target.value;
               updateUrlSearchParams({ search: target.value });
               updateSearchClearVisibility();
               const activeContent = document.querySelector('.content.active');
               if (activeContent?.id === 'eventsContent') {
                 window.filterAndRenderEvents();
               } else if (activeContent?.id === 'propertiesContent') {
                 renderProperties();
               } else if (activeContent?.id === 'dimensionsContent') {
                 renderDimensions();
               }
               updateCounts();
             }
           });

           document.getElementById('dimensionFilter')?.addEventListener('change', (e) => {
             const target = e.currentTarget;
             if (target instanceof HTMLSelectElement) {
               window.state.filters.dimension = target.value;
               window.filterAndRenderEvents();
               updateCounts();
             }
           });

           document.getElementById('listAllButton')?.addEventListener('click', (e) => {
             const target = e.currentTarget;
             const groupButton = document.getElementById('groupByDimButton');
             if (target instanceof HTMLButtonElement && groupButton instanceof HTMLButtonElement) {
               target.classList.add('active');
               groupButton.classList.remove('active');
               window.state.grouping = 'none';
               window.filterAndRenderEvents();
               updateCounts();
             }
           });

           document.getElementById('groupByDimButton')?.addEventListener('click', (e) => {
             const target = e.currentTarget;
             const listButton = document.getElementById('listAllButton');
             if (target instanceof HTMLButtonElement && listButton instanceof HTMLButtonElement) {
               target.classList.add('active');
               listButton.classList.remove('active');
               window.state.grouping = 'dimension';
               window.filterAndRenderEvents();
               updateCounts();
             }
           });

           // Update count displays
           function updateCounts() {
             const eventsCount = document.getElementById('eventsCount');
             const propertiesCount = document.getElementById('propertiesCount');
             const dimensionsCount = document.getElementById('dimensionsCount');

             const filteredEventImplementations = filterEvents(window.state.events) || [];
             const filteredEventNames = new Set(filteredEventImplementations.map(event => event.name));
             const filteredProperties = filterProperties() || [];
             const filteredDimensions = filterDimensions() || [];

             if (eventsCount) {
               eventsCount.textContent = filteredEventNames.size + ' events and ' + filteredEventImplementations.length + ' implementations from ' + window.state.schemaFileCount + ' analytics schema files';
             }
             if (propertiesCount) {
               propertiesCount.textContent = filteredProperties.length + ' properties from ' + window.state.schemaFileCount + ' analytics schema files';
             }
             if (dimensionsCount) {
               dimensionsCount.textContent = filteredDimensions.length + ' dimensions from ' + window.state.schemaFileCount + ' analytics schema files';
             }
           }

           // Call updateCounts on initial load
           updateCounts();

           // Initial render
           window.filterAndRenderEvents();

           // Add new toggle function for collapsible sections
           window.toggleCollapsible = function(id) {
             const section = document.getElementById(id)?.parentElement;
             if (section) {
               section.classList.toggle('expanded');
             }
           };
         </script>
       </body>
     </html>
   `;
}
