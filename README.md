# Voltage Schema

A type-safe analytics schema and tracking library.

## Features

- Robust analytics schema configuration
- Auto-doc of all analytics data
- Type-safe tracking generated from schemas
- Agnostic of destination (works with any analytics vendor)

## Installation

```bash
npm install voltage-schema
```

## Usage

### 1. Configure Analytics

Create an `analytics.config.json` file in your project root:

```json
{
  "generates": [
    {
      "globals": "./analytics.globals.json",
      "events": "./analytics.events.json",
      "output": "/__analytics_generated__/analytics.ts"
    }
  ]
}
```

### 2. Define Events

Create `analytics.events.json` to define your events:

```json
{
  "events": {
    "page_view": {
      "properties": [
        {
          "name": "page_title",
          "type": "string"
        },
        {
          "name": "page_url",
          "type": "string"
        }
      ]
    },
    "button_click": {
      "properties": [
        {
          "name": "button_id",
          "type": "string"
        },
        {
          "name": "button_text",
          "type": "string"
        }
      ]
    }
  }
}
```

### 3. Using the Tracker

```typescript
import { AnalyticsTracker, TrackerEvents, TrackerOptions, trackingConfig } from './__analytics_generated__/analytics';
import { createAnalyticsTracker } from 'voltage-schema';

// Create a tracker instance
const tracker: AnalyticsTracker<TrackerEvents> = createAnalyticsTracker<TrackerEvents>(trackingConfig, {
  // Required callback to send events
  onEventTracked: (eventName, eventProperties, groupProperties) => {
    // Send the event to your analytics service
  },
  onGroupUpdate: (groupName, properties) => {
    // Send the group traits to your analytics service
  },
} as TrackerOptions<GeneratedTrackerEvents>);

// Track a page view event
tracker.track('page_view', {
  page_title: 'Home Page',
  page_url: 'https://example.com'
});

// Track a button click event
tracker.track('button_click', {
  button_id: 'signup_button',
  button_text: 'Sign Up'
});
```

### 4. CLI Commands

```bash
# Initialize a new analytics schema
npm voltage init

# Validate your analytics configuration
npm voltage validate

# Generate TypeScript types for your events and properties
npm voltage generate

# List all dimensions and their events
npm voltage dimensions

# List all properties and their events
npm voltage properties

# List all events and their properties
npm voltage events
```

## License

MIT
