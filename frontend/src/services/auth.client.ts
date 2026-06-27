import { createAuthClient } from 'better-auth/react';

const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const authClient = createAuthClient({
  baseURL: `${apiBaseUrl}/auth`,
  user: {
    additionalFields: {
      role: {
        type: 'string',
      },
    },
  },
});
