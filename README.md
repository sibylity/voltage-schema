# Voltage Schema

A comprehensive analytics schema system that provides type-safe tracking & documentation that can be read & understood by AI agents to help with analysis.

## Features

- **Type-Safe Analytics**
  - Robust analytics schema configuration
  - Type-safe tracking generated from schemas
  - Agnostic of destination (works with any analytics vendor)

- **Documentation & Understanding**
  - Auto-generated documentation of all analytics data
  - Rich context for events, properties, and dimensions
  - Interactive documentation viewer

- **Schema Evolution Tracking**
  - Historical tracking of schema changes
  - AI-readable format for analytics understanding
  - Context preservation for data analysis

- **AI-Assisted Analytics**
  - Machine-readable schema documentation
  - Historical context for AI analysis
  - Evolution tracking for intelligent data interpretation

## Installation

```bash
npm install voltage-schema
```

## Usage

Schema files for voltage can be initialized by running ```npm voltage init```.

### 1. Configure Analytics

Create an `analytics.config.json` file in your project root:

```json
{
  "generates": [
    {
      "dimensions": ["./analytics.all-dimensions.json"], // optional
      "groups": ["./analytics.all-groups.json"], // optional
      "events": "./analytics.events.json", // required
      "output": "/__analytics_generated__/analytics.ts" // required
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
      "name": "Page View",
      "description": "Triggered when a user views a page.",
      "dimensions": ["Free", "Paid"],
      "properties": [
        {
          "name": "Page Name",
          "description": "The name of the page that was viewed.",
          "type": "string"
        }
      ]
    },
    "add_user": {
      "name": "Add User",
      "description": "Triggered when an admin adds a user to their team. This requires a paid plan.",
      "dimensions": ["Paid"],
      "properties": [
        {
          "name": "Role",
          "description": "The role of the user that was added.",
          "type": ["admin", "member"]
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
  onGroupUpdated: (groupName, properties) => {
    // Send the group traits to your analytics service
  },
} as TrackerOptions<GeneratedTrackerEvents>);

// Track a page view event
tracker.track('page_view', {
  page_title: 'Home Page',
  page_url: 'https://example.com'
});

// Track a button click event
tracker.track('add_user', {
  Role: 'member',
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

# Start a local documentation server
npm voltage autodoc
```

### 5. Documentation

The autodoc system provides:
- Comprehensive documentation of all analytics events
- Property and dimension definitions
- Historical schema changes
- Machine-readable format for AI consumption

Access the documentation by running:
```bash
npm voltage autodoc
```

## Contributing

When contributing to Voltage Schema:
1. Ensure all events and properties are well-documented
2. Include clear descriptions and context
3. Follow the schema evolution guidelines
4. Run validation and tests before submitting changes

## License

MIT
