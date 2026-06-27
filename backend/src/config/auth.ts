import { betterAuth } from 'better-auth';
import pool from './db.js';

export const auth = betterAuth({
  database: pool,
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'Viewer',
      },
    },
  },
  trustedOrigins: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
  ],
  advanced: {
    // Disable origin checks to make local development with dynamic ports robust
    disableOriginCheck: true,
  },
});
export type Auth = typeof auth;
