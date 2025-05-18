import { getAllEvents } from './analyticsEventUtils';
import { getAllProperties } from './analyticsPropertyUtils';
import { getAllDimensions } from './analyticsDimensionUtils';
import type { EventData } from './analyticsEventUtils';

export function generateAutodocHtml(): string {
  const events = getAllEvents() as EventData[];
  const properties = getAllProperties();
  const dimensions = getAllDimensions();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Analytics Documentation</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    h1, h2, h3 {
      color: #2c3e50;
    }
    .section {
      margin-bottom: 40px;
    }
    .event {
      margin-bottom: 30px;
      padding: 20px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    .event-name {
      font-size: 1.2em;
      font-weight: bold;
      color: #0366d6;
    }
    .description {
      color: #666;
    }
    .properties {
      margin-top: 10px;
    }
    .property {
      margin: 5px 0;
      padding: 5px;
      background: #f6f8fa;
      border-radius: 3px;
    }
    .dimensions {
      margin-top: 10px;
    }
    .dimension {
      margin: 5px 0;
      padding: 5px;
      background: #f6f8fa;
      border-radius: 3px;
    }
  </style>
</head>
<body>
  <h1>Analytics Events</h1>

  <div class="section">
    <h2>Events</h2>
    ${events.map(event => `
      <div class="event">
        <div class="event-name">${event.name}</div>
        ${event.description ? `<div class="description">${event.description}</div>` : ''}
        <div class="properties">
          <h3>Properties</h3>
          ${event.properties.map(prop => `
            <div class="property">
              <strong>${prop.name}</strong> (${prop.type})
              ${prop.description ? ` - ${prop.description}` : ''}
            </div>
          `).join('')}
        </div>
        ${event.dimensions && event.dimensions.length > 0 ? `
          <div class="dimensions">
            <h3>Dimensions</h3>
            ${event.dimensions.map(dim => `
              <div class="dimension">${dim}</div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `).join('')}
  </div>

  <div class="section">
    <h2>Properties</h2>
    ${Object.entries(properties).map(([, prop]) => `
      <div class="property">
        <div class="property-name">${prop.name}</div>
        ${prop.description ? `<div class="description">${prop.description}</div>` : ''}
        <div class="description">Source: ${prop.source}${prop.groupName ? ` (${prop.groupName})` : ''}</div>
      </div>
    `).join('')}
  </div>

  <div class="section">
    <h2>Dimensions</h2>
    ${Object.entries(dimensions).map(([, dimension]) => `
      <div class="dimension">
        <div class="dimension-name">${dimension.name}</div>
        ${dimension.description ? `<div class="description">${dimension.description}</div>` : ''}
        ${dimension.events ? `
          <div class="dimension-list">
            ${dimension.events.map(event => `
              <div class="dimension-item">
                <span class="event-name">${event}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `).join('')}
  </div>
</body>
</html>
  `;
}

