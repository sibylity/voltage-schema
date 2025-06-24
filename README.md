Voltage provides type-safe vendor agnostic tracking, an auto-doc of analytics data, and AI ready analytics context.

[View Documentation](https://voltage-schema.com/)

## Features

Instead of providing a feature packed tracker, the tracker provided by voltage acts as a type-safe gate-check for events to pass through before being handed off to another analytics tracker _(segment / amplitude / posthog)_.

- **Type-Safe Analytics**
  - Robust analytics schema configuration
  - Type-safe tracking generated from schemas
  - Agnostic of destination (works with any analytics vendor)

- **Documentation & Understanding**
  - Auto-generated documentation of all analytics data
  - Rich context for events, properties, and dimensions
  - Generates JSON for providing to APIs & AI agents

## Installation

```bash
npm install voltage-schema
```

## Schema Usage

Schema files for voltage can be initialized by running ```npm voltage init```.

### File Extensions

Voltage supports multiple file extensions for schema files:
- `.yaml` or `.yml` - Standard YAML format
- `.json` - JSON format

The `voltage.config.json` file must use the `.json` extension.

### 1. Configure Your Analytics Codegen

<details>

<summary>Schema reference</summary>

#### Codegen Config

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| events | string | yes | The path to the events file that types & tracking config will be generated from. |
| groups | string[] | no | The path to all of the groups file(s) that exist for the events being tracked. If an event is not tracked with a group, then that event should be a part of a codegen config that does not include the group. |
| dimensions | string[] | no | The path to all of the dimension file(s) that exist for the events being tracked. If a dimension is identified by a group, then that group must be included in the codegen config with the dimension. |
| output | string | yes | The file path to write the generated types & tracking config to. When this file path ends in .ts, typescript types are generated. When it ends in ".js", no types are generated.  |
| disableComments | boolean | no | By default, event, property, & group descriptions are added as jsDoc style comments on their generated types & tracking configs. |
| eventKeyPropertyName | string | no | The name of the property that will be auto-generated to store the event key. Defaults to 'Event Key' if not specified. This property will be added to all events with a defaultValue set to the event's key. |

</details>

Create a `voltage.config.js` file in your project root:

```javascript
export default {
  generates: [
    {
      events: "./analytics/events/unauthed-events.volt.yaml",
      output: "/__analytics_generated__/unauthed-analytics.ts"
    },
    {
      events: "./analytics/events/authed-events.volt.yaml",
      groups: [
        "./analytics/groups/user-group.volt.yaml",
        "./analytics/groups/team-group.volt.yaml"
      ],
      dimensions: [
        "./analytics/dimensions/user-role-dimensions.volt.yaml",
        "./analytics/dimensions/team-plan-dimensions.volt.yaml"
      ],
      output: "/__analytics_generated__/authed-analytics.ts"
    }
  ]
}
```

_Note - in this example, we are generating types & config for unauthed vs. authed tracking. This is because authed events are sent with the context of the user & the team that they belong to. Whereas when we track unauthed events, this context is unknown._

### 2. Define Events

<details>

<summary>Schema reference</summary>

#### Event

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| name | string | yes | The name of the event. |
| description | string | no | Describe the context of the event. |
| dimensions | { included: string[], excluded: string[] } | no | The dimensions that the event exists in. When dimensions are not set, the event will be auto-associated with each dimension. When included, an event only exists in the supplied dimensions. When excluded, an event exists in all dimensions except for the supplied dimensions. |
| passthrough | boolean | no | Allow arbitrary properties to be tracked with the event. |
| properties | Property[] | no | The properties to track with the event. All properties are required unless marked as optional. Unlisted properties will be disallowed unless passthrough is enabled. |

#### Property

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| name | string | yes | The name of the property. |
| description | string | no | Describe the context of the property. |
| type | string, string[], boolean, Boolean[], number, number[], oneOf | yes | The expected typescript type for the property value. |
| defaultValue | any | no | The static property value to be tracked with the event. |
| optional | boolean | no | Mark the property as optional when tracking the event. Note that properties are required by default. |

</details>

Create an `events.volt.yaml` file to define your events:

```yaml
events:
  page_view:
    name: Page View
    description: Triggered when a user views a page.
    properties:
      - name: Page Name
        description: The name of the page that was viewed.
        type: string

  add_user:
    name: Add User
    description: Triggered when an admin adds a user to their team. This requires a paid plan.
    properties:
      - name: Role
        description: The role of the user that was added.
        type:
          - admin
          - member
```

### 3. Define Groups

<details>

<summary>Schema reference</summary>

#### Group

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| name | string | yes | The name of the group. |
| description | string | no | Describe the context of the group. |
| identifiedBy | string | no | The property that the group is identified by. |
| passthrough | boolean | no | Allow arbitrary properties to be set on the group. |
| properties | Property[] | no | The properties to set on the group. All properties are required unless marked as optional. Unlisted properties will be disallowed unless passthrough is enabled. |

#### Property

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| name | string | yes | The name of the property. |
| description | string | no | Describe the context of the property. |
| type | string, string[], boolean, Boolean[], number, number[], oneOf | yes | The expected typescript type for the property value. |
| defaultValue | any | no | The static property value to be tracked with the event. |
| optional | boolean | no | Mark the property as optional when tracking the event. Note that properties are required by default. |

</details>

Create a `groups.volt.yaml` file to define your groups:

```yaml
groups:
  - name: User
    description: The user that triggered the event.
    identifiedBy: UserID
    properties:
      - name: UserID
        description: The ID of the user that triggered the event.
        type: number
      - name: Role
        description: The role of the user that triggered the event.
        type:
          - admin
          - member

  - name: Team
    description: The team of the user that triggered the event.
    identifiedBy: TeamID
    properties:
      - name: TeamID
        description: The ID of the team of the user that triggered the event.
        type: number
      - name: Plan
        description: The plan of the team of the user that triggered the event.
        type:
          - FREE
          - TRIAL
          - PAID
```

### 4. Dimensions

<details>

<summary>Schema reference</summary>

#### Dimension

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| name | string | yes | The name of the dimension. |
| description | string | no | Describe the context of the dimension. |
| identifiers | DimensionIdentifier[] | yes | The property filters used to identify which users belong in the dimension. |

#### Dimension Identifier

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| property | string | yes | The group property to target for identifying the dimension. |
| group | string | yes | The group to read the property from for identifying the dimension. |
| equals | string, number, boolean | no | Filter for groups where the property matches the given value. |
| not | string, number, boolean | no | Filter for groups where the property does not match the given value. |
| contains | string | no | Filter for groups where the property contains a string value. |
| in | string[], number[], boolean[] | no | Filter for groups where the property is one of the values in the list. |
| notIn | string[], number[], boolean[] | no | Filter for groups where the property is not one of the values in the list. |
| startsWith | string | no | Filter for groups where the property starts with a given string. |
| endsWith | string | no | Filter for groups where the property ends with a given string. |
| lt | number | no | Filter for groups where the numeric property value is less than a given numeric value. |
| lte | number | no | Filter for groups where the numeric property value is less than or equal to a given numeric value. |
| gt | number | no | Filter for groups where the numeric property value is greater than a given numeric value. |
| gte | number | no | Filter for groups where the numeric property value is greater than or equal to a given numeric value. |

</details>

Create a `dimensions.volt.yaml` file to define your dimensions:

```yaml
dimensions:
  - name: Free
    description: Teams without a paid plan.
    identifiers:
      OR:
        - property: Plan
          group: Team
          equals: FREE
        - property: Plan
          group: Team
          equals: TRIAL

  - name: Paid
    description: Teams with a paid plan.
    identifiers:
      AND:
        - property: Plan
          group: Team
          not: FREE
        - property: Plan
          group: Team
          not: TRIAL
```

## Using the tracker

```typescript
import { AnalyticsSchema, trackingConfig } from './__analytics_generated__/analytics';
import { createAnalyticsTracker } from 'voltage-schema';

// Create a tracker instance
const tracker = createAnalyticsTracker<AnalyticsSchema>(trackingConfig, {
  // Required callback to send events
  onEventTracked: (eventName, eventProperties, groupProperties) => {
    // Send the event to your analytics service
  },
  onGroupUpdated: (groupName, properties) => {
    // Send the group traits to your analytics service
  },
});

// Set group properties
tracker.setProperties('User', {
  UserId: 123,
  Role: 'admin'
});

// Track when a user views a page
tracker.track('page_view', {
  "Page Name": 'Home',
});
```

### 5. CLI Commands

```bash
# Initialize a new analytics schema
npm voltage init
npm voltage init -- --reset

# Validate your analytics configuration
npm voltage validate

# Generate TypeScript types & tracking config from your codegen config
npm voltage generate

# List all events and their properties
npm voltage events
npm voltage events -- --include-groups
npm voltage events -- --include-dimensions
npm voltage events -- --verbose

# List all properties and their events
npm voltage properties
npm voltage properties -- --verbose

# List all dimensions and their events
npm voltage dimensions
npm voltage dimensions -- --include-event-details
npm voltage dimensions -- --verbose
```

### Auto-doc Package

For keeping the dependencies of ```voltage-schema``` at a minimum, a separate ```devDependency``` package is provided for ```voltage-autodoc```.

```bash
# Open the autodoc in your browser, or output it's HTML for CI
npm voltage-autodoc
npm voltage-autodoc -- --output-html  # Output HTML instead of starting server
```

## License

MIT
