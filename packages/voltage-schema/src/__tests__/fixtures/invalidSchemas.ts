// Invalid schemas for testing error cases

export const invalidEventsSchema = {
  events: {
    invalid_event: {
      // Missing required 'name' field
      description: "An invalid event for testing.",
      properties: [
        {
          name: "Duplicate Property",
          type: "string"
        },
        {
          name: "Duplicate Property", // Duplicate property name
          type: "number"
        }
      ]
    },
    event_with_bad_dimensions: {
      name: "Event with Bad Dimensions",
      description: "Event referencing non-existent dimensions.",
      dimensions: {
        included: ["NonExistentDimension"]
      },
      properties: []
    },
    event_with_invalid_meta: {
      name: "Event with Invalid Meta",
      description: "Event with invalid meta fields.",
      meta: {
        "UnknownMetaField": "invalid value"
      },
      properties: []
    }
  }
};

export const invalidGroupsSchema = {
  groups: [
    {
      // Missing required 'name' field
      description: "A group without a name.",
      properties: [
        {
          name: "Property",
          type: "string"
        }
      ]
    },
    {
      name: "Group With Duplicate Properties",
      description: "A group with duplicate property names.",
      properties: [
        {
          name: "Duplicate",
          type: "string"
        },
        {
          name: "Duplicate", // Duplicate property name
          type: "number"
        }
      ]
    }
  ]
};

export const invalidDimensionsSchema = {
  dimensions: [
    {
      // Missing required 'name' field
      description: "A dimension without a name.",
      identifiers: []
    },
    {
      name: "Dimension Without Identifiers",
      description: "A dimension missing identifiers."
      // Missing required 'identifiers' field
    }
  ]
};

export const invalidMetaSchema = {
  meta: [
    {
      // Missing required 'name' field
      description: "A meta rule without a name.",
      type: "string"
    },
    {
      name: "Meta Without Type",
      description: "A meta rule without a type."
      // Missing required 'type' field
    }
  ]
};

export const invalidConfigSchema = {
  generates: [
    {
      // Missing required 'events' field
      output: "./__analytics_generated__/analytics.ts"
    },
    {
      events: "./analytics/events/events.volt.yaml",
      // Missing required 'output' field
      groups: ["./analytics/groups/groups.volt.yaml"]
    }
  ]
}; 