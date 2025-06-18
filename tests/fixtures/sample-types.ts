// Sample pre-generated types for testing
export interface SampleTrackerEvents {
  events: {
    'user_signup': {
      name: 'User Signup';
      properties: {
        userId: string;
        email: string;
        source?: string;
      };
      meta: {
        category: 'user';
        version: 1;
      };
    };
    'page_view': {
      name: 'Page View';
      properties: {
        page: string;
        referrer?: string;
      };
      meta: {
        category: 'navigation';
        version: 1;
      };
    };
    'button_click': {
      name: 'Button Click';
      properties: {
        buttonId: string;
        page: string;
      };
      meta: {
        category: 'interaction';
        version: 1;
      };
    };
  };
  groups: {
    'user': {
      name: 'User';
      properties: {
        id: string;
        email: string;
        plan?: string;
        isActive: boolean;
      };
    };
    'session': {
      name: 'Session';
      properties: {
        sessionId: string;
        startTime: number;
        userAgent: string;
      };
    };
  };
}

// Helper types for testing
export type SampleEventKeys = keyof SampleTrackerEvents['events'];
export type SampleGroupKeys = keyof SampleTrackerEvents['groups'];

// Sample runtime configuration that matches the types
export const sampleTrackerConfig = {
  events: {
    'user_signup': {
      name: 'User Signup',
      properties: [
        { name: 'userId', type: 'string' },
        { name: 'email', type: 'string' },
        { name: 'source', type: 'string', optional: true }
      ],
      meta: { category: 'user', version: 1 }
    },
    'page_view': {
      name: 'Page View',
      properties: [
        { name: 'page', type: 'string' },
        { name: 'referrer', type: 'string', optional: true }
      ],
      meta: { category: 'navigation', version: 1 }
    },
    'button_click': {
      name: 'Button Click',
      properties: [
        { name: 'buttonId', type: 'string' },
        { name: 'page', type: 'string' }
      ],
      meta: { category: 'interaction', version: 1 }
    }
  },
  groups: {
    'user': {
      name: 'User',
      properties: [
        { name: 'id', type: 'string' },
        { name: 'email', type: 'string' },
        { name: 'plan', type: 'string', optional: true },
        { name: 'isActive', type: 'boolean', defaultValue: true }
      ]
    },
    'session': {
      name: 'Session',
      properties: [
        { name: 'sessionId', type: 'string' },
        { name: 'startTime', type: 'number' },
        { name: 'userAgent', type: 'string' }
      ]
    }
  }
}; 