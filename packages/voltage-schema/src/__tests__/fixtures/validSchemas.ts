import { AnalyticsEvents, Group, AnalyticsSchemaDimension, AnalyticsSchemaMetaRule, AnalyticsConfig } from '../../types';

export const validEventsSchema: AnalyticsEvents = {
  events: {
    page_view: {
      name: "Page View",
      description: "Triggered when a user views a page.",
      dimensions: {
        included: ["Free", "Paid"]  
      },
      properties: [
        {
          name: "Page Name",
          description: "The name of the page that was viewed.",
          type: "string"
        },
        {
          name: "User Agent",
          description: "The browser user agent string.",
          type: "string",
          optional: true
        }
      ],
      meta: {
        "Source": "web",
        "Debug Mode": false
      }
    },
    user_signup: {
      name: "User Signup",
      description: "Triggered when a user creates an account.",
      properties: [
        {
          name: "Registration Method",
          description: "How the user signed up.",
          type: ["email", "google", "github"]
        },
        {
          name: "Marketing Campaign",
          description: "The campaign that led to signup.",
          type: "string",
          optional: true
        },
        {
          name: "Is Trial",
          description: "Whether the user started with a trial.",
          type: "boolean",
          defaultValue: false
        }
      ],
      meta: {
        "Source": "web",
        "Debug Mode": false
      }
    },
    message_sent: {
      name: "Message Sent",
      description: "Triggered when a user sends a message.",
      properties: [
        {
          name: "Message Type",
          description: "Describes how the message was sent.",
          type: ["email", "sms", "in-app"]
        },
        {
          name: "Thread Message Count",
          description: "The number of messages in the thread.",
          type: "number"
        },
        {
          name: "Has Read Receipts",
          description: "Indicates whether the sending user will receive a read receipt.",
          optional: true,
          type: "boolean"
        }
      ],
      meta: {
        "Source": "web",
        "Debug Mode": false
      }
    }
  }
};

export const validGroupsSchema: { groups: Group[] } = {
  groups: [
    {
      name: "User",
      description: "The user that triggered the event.",
      identifiedBy: "UserID",
      properties: [
        {
          name: "UserID",
          description: "The ID of the user.",
          type: "number"
        },
        {
          name: "Role",
          description: "The user's role.",
          type: ["admin", "member", "viewer"]
        },
        {
          name: "Email",
          description: "The user's email address.",
          type: "string"
        }
      ]
    },
    {
      name: "Team",
      description: "The team of the user that triggered the event.",
      identifiedBy: "TeamID",
      properties: [
        {
          name: "TeamID",
          description: "The ID of the team.",
          type: "number"
        },
        {
          name: "Plan",
          description: "The plan of the team.",
          type: ["FREE", "TRIAL", "PAID"]
        },
        {
          name: "Created At",
          description: "When the team was created.",
          type: "string"
        }
      ]
    }
  ]
};

export const validDimensionsSchema: { dimensions: any[] } = {
  dimensions: [
    {
      name: "Free",
      description: "Users on the free plan.",
      identifiers: {
        AND: [
          {
            property: "Plan",
            group: "Team",
            equals: "FREE"
          }
        ]
      }
    },
    {
      name: "Paid",
      description: "Users on paid plans.",
      identifiers: {
        OR: [
          {
            property: "Plan",
            group: "Team", 
            equals: "PAID"
          }
        ]
      }
    },
    {
      name: "Trial",
      description: "Users on trial plans.",
      identifiers: {
        AND: [
          {
            property: "Plan",
            group: "Team",
            equals: "TRIAL"
          }
        ]
      }
    }
  ]
};

export const validMetaSchema: { meta: AnalyticsSchemaMetaRule[] } = {
  meta: [
    {
      name: "Source",
      description: "The source of the event.",
      type: ["web", "mobile", "api"],
      optional: false
    },
    {
      name: "Version",
      description: "The version of the application.",
      type: "string",
      optional: true
    },
    {
      name: "Debug Mode",
      description: "Whether debug mode is enabled.",
      type: "boolean",
      defaultValue: false
    }
  ]
};

export const validConfigSchema: AnalyticsConfig = {
  generates: [
    {
      events: "./analytics/events/events.volt.yaml",
      groups: ["./analytics/groups/groups.volt.yaml"],
      dimensions: ["./analytics/dimensions/dimensions.volt.yaml"],
      meta: "./analytics/meta/meta.volt.yaml",
      output: "./__analytics_generated__/analytics.ts"
    }
  ]
}; 