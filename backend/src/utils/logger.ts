import pino from 'pino';

export const logger = pino({
  redact: ['*.password', '*.connectionString', 'DATABASE_URL', 'BETTER_AUTH_SECRET', 'AI_API_KEY'],
  level: process.env.LOG_LEVEL || 'info',
});
