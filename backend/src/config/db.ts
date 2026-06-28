import pg from 'pg';
import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  logger.fatal('DATABASE_URL is not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('sslmode=require') || connectionString.includes('neon.tech')
    ? { rejectUnauthorized: false }
    : false,
});

// Test the connection on startup
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    logger.error({ err }, 'Database connection failed');
  } else {
    logger.info({ timestamp: res.rows[0].now }, 'Database connected');
  }
});

export default pool;
