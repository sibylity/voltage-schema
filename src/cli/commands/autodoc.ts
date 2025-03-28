import { Command } from "commander";
import express, { Request, Response } from "express";
import opener from "opener";
import { validateAnalyticsFiles } from "../validation";
import { getAllEvents } from "../utils/analyticsEventUtils";
import { getAllProperties } from "../utils/analyticsPropertyUtils";
import { getAllDimensions } from "../utils/analyticsDimensionUtils";

interface Property {
  name: string;
  type: string;
  description?: string;
  source: 'event' | 'group';
  groupName?: string;
}

interface Dimension {
  name: string;
}

interface Contributor {
  name: string;
}

interface AnalyticsEvent {
  name: string;
  key: string;
  description?: string;
  dimensions?: Dimension[];
  properties: Property[];
  contributors?: Contributor[];
  updated?: string;
}

interface AppState {
  events: AnalyticsEvent[];
  filters: {
    search: string;
    dimension: string;
    activeFilters: Set<string>;
  };
  grouping: 'dimension' | 'date' | 'none';
}

// Declare types for DOM elements to avoid TypeScript errors
declare global {
  interface Window {
    state: AppState;
    addFilter: (type: string, value: string) => void;
    removeFilter: (filter: string) => void;
    filterAndRenderEvents: () => void;
    formatDate: (dateStr: string) => string;
  }
}

export function registerAutodocCommand(program: Command) {
  program
    .command("autodoc")
    .description("Start a local server to view analytics documentation")
    .action(async () => {
      try {
        console.log("🔍 Running validation before starting documentation server...");
        if (!validateAnalyticsFiles()) {
          process.exit(1);
        }

        const app = express();
        const port = 5555;

        // Serve static assets
        app.get("/", (req: Request, res: Response) => {
          const events = getAllEvents({ verbose: true }) as AnalyticsEvent[];
          const properties = getAllProperties({ verbose: true });
          const dimensions = getAllDimensions({ verbose: true });

          const htmlTemplate = `
            <!DOCTYPE html>
            <html>
              <head>
                <title>Analytics Documentation</title>
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
                    grid-template-columns: auto 1fr auto;
                    align-items: center;
                    gap: 2rem;
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
                  }

                  .container {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 0 2rem;
                    min-height: calc(100vh - 88px); /* Match content min-height */
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
                    gap: 1.5rem;
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
                  }

                  .event-dimensions {
                    display: flex;
                    gap: 0.5rem;
                    flex-wrap: wrap;
                  }

                  .event-tag {
                    font-size: 0.75rem;
                    padding: 0.25rem 0.75rem;
                    border-radius: 1rem;
                    background: var(--bg-secondary);
                    color: var(--text-secondary);
                    transition: all 0.15s ease;
                    cursor: pointer;
                    user-select: none;
                  }

                  .event-tag:hover {
                    background: var(--primary-color);
                    color: white;
                  }

                  .event-stat {
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                    background: var(--bg-secondary);
                    padding: 0.375rem 0.75rem;
                    border-radius: 1rem;
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

                  @media (max-width: 640px) {
                    .header {
                      padding: 1rem;
                    }

                    .container {
                      padding: 1rem;
                    }

                    .header-content {
                      grid-template-columns: 1fr;
                      gap: 1rem;
                    }

                    .nav {
                      width: 100%;
                    }

                    .controls {
                      width: 100%;
                    }

                    .search-bar {
                      width: 100%;
                    }
                  }

                  .logo {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: var(--text-primary);
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

                  #propertyList, #dimensionList, #eventGroups {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                    padding: 2rem 0;
                  }
                </style>
              </head>
              <body>
                <header class="header">
                  <div class="header-content">
                    <div class="logo">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M13 3L4 14h7l-2 7 9-11h-7l2-7z" fill="currentColor"/>
                      </svg>
                      <span>Voltage</span>
                    </div>
                    <nav class="nav">
                      <button class="nav-item active" onclick="showContent('events')">Events</button>
                      <button class="nav-item" onclick="showContent('properties')">Properties</button>
                      <button class="nav-item" onclick="showContent('dimensions')">Dimensions</button>
                    </nav>
                    <div class="controls">
                      <div class="filter-bar">
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
                        <div class="search-bar">
                          <input type="text" placeholder="Search..." id="searchInput">
                        </div>
                      </div>
                    </div>
                  </div>
                </header>

                <main class="container">
                  <div id="eventsContent" class="content active">
                    <div id="eventGroups"></div>
                  </div>
                  <div id="propertiesContent" class="content">
                    <div id="propertyList"></div>
                  </div>
                  <div id="dimensionsContent" class="content">
                    <div id="dimensionList"></div>
                  </div>
                </main>
                <script>
                  // Initialize state with all data
                  window.state = {
                    events: JSON.parse('${JSON.stringify(events).replace(/'/g, "\\'")}'),
                    properties: JSON.parse('${JSON.stringify(properties).replace(/'/g, "\\'")}'),
                    dimensions: JSON.parse('${JSON.stringify(dimensions).replace(/'/g, "\\'")}'),
                    filters: {
                      search: '',
                      dimension: '',
                      activeFilters: new Set()
                    },
                    grouping: 'none'
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

                  function renderProperties() {
                    const container = document.getElementById('propertyList');
                    if (!container) return;

                    container.innerHTML = window.state.properties
                      .map(prop => {
                        const sourcesHtml = prop.sources.map(source => {
                          const descriptionHtml = source.description 
                            ? '<div class="property-description">' + source.description + '</div>'
                            : '';
                          return '<div class="property">' +
                            '<div class="property-name">' + source.name + '</div>' +
                            '<div class="property-type">' + source.type + '</div>' +
                            descriptionHtml +
                            '</div>';
                        }).join('');

                        return '<div class="event-row">' +
                          '<div class="event-summary" onclick="toggleDetails(&quot;' + prop.property + '&quot;)">' +
                            '<div class="event-summary-left">' +
                              '<div class="event-basic-info">' +
                                '<div class="event-name">' + prop.property + '</div>' +
                                '<div class="event-key">' + prop.types.join(' | ') + '</div>' +
                              '</div>' +
                            '</div>' +
                            '<div class="event-stat">' +
                              '<span>' + prop.sources.length + '</span>' +
                              '<span>sources</span>' +
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
                  }

                  function renderDimensions() {
                    const container = document.getElementById('dimensionList');
                    if (!container) return;

                    container.innerHTML = window.state.dimensions
                      .map(dim => {
                        const identifiersHtml = dim.identifiers.map(identifier => {
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

                        const eventDetailsHtml = dim.eventDetails ? 
                          '<div class="section-title">Events</div>' +
                          '<div class="property-list">' +
                            dim.eventDetails.map(event => {
                              const descriptionHtml = event.description 
                                ? '<div class="property-description">' + event.description + '</div>'
                                : '';
                              return '<div class="property">' +
                                '<div class="property-name">' + event.name + '</div>' +
                                '<div class="property-type">' + event.key + '</div>' +
                                descriptionHtml +
                                '</div>';
                            }).join('') +
                          '</div>' : '';

                        return '<div class="event-row">' +
                          '<div class="event-summary" onclick="toggleDetails(&quot;' + dim.dimension + '&quot;)">' +
                            '<div class="event-summary-left">' +
                              '<div class="event-basic-info">' +
                                '<div class="event-name">' + dim.dimension + '</div>' +
                                '<div class="event-key">' + dim.description + '</div>' +
                              '</div>' +
                            '</div>' +
                            '<div class="event-stat">' +
                              '<span>' + dim.events.length + '</span>' +
                              '<span>events</span>' +
                            '</div>' +
                          '</div>' +
                          '<div class="event-details" id="details-' + dim.dimension + '">' +
                            '<div class="section-title">Identifiers</div>' +
                            '<div class="property-list">' +
                              identifiersHtml +
                            '</div>' +
                            eventDetailsHtml +
                          '</div>' +
                        '</div>';
                      })
                      .join('');
                  }

                  function renderEventCard(event) {
                    const eventProperties = event.properties.filter(p => p.source === 'event');
                    const groupProperties = event.properties.filter(p => p.source === 'group');

                    const eventPropertiesHtml = eventProperties.length > 0 ?
                      '<div class="section-title">Event Properties</div>' +
                      '<div class="property-list">' +
                        eventProperties.map(prop => {
                          const descriptionHtml = prop.description 
                            ? '<div class="property-description">' + prop.description + '</div>'
                            : '';
                          return '<div class="property">' +
                            '<div class="property-name">' + prop.name + '</div>' +
                            '<div class="property-type">' + prop.type + '</div>' +
                            descriptionHtml +
                            '</div>';
                        }).join('') +
                      '</div>' : '';

                    const groupPropertiesHtml = groupProperties.length > 0 ?
                      '<div class="section-title">Group Properties</div>' +
                      '<div class="property-list">' +
                        groupProperties.map(prop => {
                          const descriptionHtml = prop.description 
                            ? '<div class="property-description">' + prop.description + '</div>'
                            : '';
                          return '<div class="property">' +
                            '<div class="property-name">' + prop.name + '</div>' +
                            '<div class="property-type">' + prop.type + '</div>' +
                            '<div class="property-source">From ' + prop.groupName + '</div>' +
                            descriptionHtml +
                            '</div>';
                        }).join('') +
                      '</div>' : '';

                    const descriptionHtml = event.description 
                      ? '<p class="event-description">' + event.description + '</p>'
                      : '';

                    const contributorsHtml = event.contributors ?
                      '<div class="event-contributors">' +
                        event.contributors.map(c => 
                          '<div class="contributor" title="' + c.name + '">' + c.name[0].toUpperCase() + '</div>'
                        ).join('') +
                      '</div>' : '';

                    const dimensionsHtml = event.dimensions?.map(d => 
                      '<span class="event-tag" onclick="filterByDimension(&quot;' + d.name + '&quot;)">' + d.name + '</span>'
                    ).join('') || '';

                    return '<div class="event-row" data-event-key="' + event.key + '">' +
                      '<div class="event-summary" onclick="toggleDetails(&quot;' + event.key + '&quot;)">' +
                        '<div class="event-summary-left">' +
                          '<div class="event-basic-info">' +
                            '<div class="event-name">' + event.name + '</div>' +
                            '<div class="event-key">' + event.key + '</div>' +
                          '</div>' +
                          '<div class="event-dimensions">' +
                            dimensionsHtml +
                          '</div>' +
                        '</div>' +
                        '<div class="event-stat">' +
                          '<span>' + event.properties.length + '</span>' +
                          '<span>properties</span>' +
                        '</div>' +
                      '</div>' +
                      '<div class="event-details" id="details-' + event.key + '">' +
                        descriptionHtml +
                        eventPropertiesHtml +
                        groupPropertiesHtml +
                        contributorsHtml +
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

                    // Scroll to top before switching content
                    window.scrollTo(0, 0);

                    // Update content sections
                    document.querySelectorAll('.content').forEach(content => {
                      content.classList.remove('active');
                    });
                    document.getElementById(section + 'Content').classList.add('active');

                    // Update controls visibility
                    const controls = document.querySelector('.controls');
                    if (section === 'events') {
                      controls.style.display = 'flex';
                      window.filterAndRenderEvents();
                    } else {
                      controls.style.display = 'none';
                      if (section === 'properties') {
                        renderProperties();
                      } else if (section === 'dimensions') {
                        renderDimensions();
                      }
                    }
                  };

                  function filterEvents(events) {
                    return events.filter(event => {
                      if (window.state.filters.search) {
                        const searchTerm = window.state.filters.search.toLowerCase();
                        const searchMatch = 
                          event.name.toLowerCase().includes(searchTerm) ||
                          event.key.toLowerCase().includes(searchTerm) ||
                          event.description?.toLowerCase().includes(searchTerm) ||
                          event.properties.some(p => 
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

                  function groupEvents(events) {
                    if (window.state.grouping === 'none') {
                      return { 'All Events': events };
                    }

                    // If filtering by dimension, only show that dimension group
                    if (window.state.filters.dimension) {
                      return {
                        [window.state.filters.dimension]: events
                      };
                    }

                    // Otherwise show all dimension groups
                    return events.reduce((acc, event) => {
                      const groups = event.dimensions?.map(d => d.name) || ['Ungrouped'];
                      groups.forEach(group => {
                        if (!acc[group]) acc[group] = [];
                        acc[group].push(event);
                      });
                      return acc;
                    }, {});
                  }

                  window.filterAndRenderEvents = function() {
                    const filteredEvents = filterEvents(window.state.events);
                    const groupedEvents = groupEvents(filteredEvents);

                    const container = document.getElementById('eventGroups');
                    if (!container) return;

                    container.innerHTML = Object.entries(groupedEvents)
                      .map(([groupName, groupEvents]) => {
                        const groupHeaderHtml = groupName !== 'All Events' ? 
                          '<div class="group-header" onclick="toggleGroup(&quot;' + groupName + '&quot;)">' +
                            '<div class="group-header-content">' +
                              '<div class="group-name">' + groupName + '</div>' +
                              '<div class="group-stats">' +
                                groupEvents.length + ' events • ' +
                                groupEvents.reduce((sum, e) => sum + e.properties.length, 0) + ' properties' +
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
                            groupEvents.map(renderEventCard).join('') +
                          '</div>' +
                        '</section>';
                      })
                      .join('');
                  };

                  window.toggleGroup = function(groupName) {
                    const group = document.getElementById('group-' + groupName);
                    if (group) {
                      group.classList.toggle('collapsed');
                    }
                  };

                  // Event listeners
                  document.getElementById('searchInput')?.addEventListener('input', (e) => {
                    const target = e.currentTarget;
                    if (target instanceof HTMLInputElement) {
                      window.state.filters.search = target.value;
                      window.filterAndRenderEvents();
                    }
                  });

                  document.getElementById('dimensionFilter')?.addEventListener('change', (e) => {
                    const target = e.currentTarget;
                    if (target instanceof HTMLSelectElement) {
                      window.state.filters.dimension = target.value;
                      window.filterAndRenderEvents();
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
                    }
                  });

                  // Initial render
                  window.filterAndRenderEvents();
                </script>
              </body>
            </html>
          `;

          res.send(htmlTemplate);
        });

        // Start the server
        app.listen(port, () => {
          console.log("📚 Documentation server running at http://localhost:" + port);
          console.log("Press 'q' to quit");
          
          // Open the browser
          opener("http://localhost:" + port);
        });

        // Handle 'q' key press to quit
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.on('data', (key) => {
          if (key[0] === 113) { // 'q' key
            console.log("\n👋 Shutting down documentation server...");
            process.exit(0);
          }
        });
      } catch (error) {
        console.error("❌ Error starting documentation server:", error);
        process.exit(1);
      }
    });
}