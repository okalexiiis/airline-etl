import { Router } from 'express';
import { getKPIs, getTrends } from '../controllers/sentiment.controller.js';
import { getAirlinesList, getAirlinesSentiment } from '../controllers/airline.controller.js';
import { getTopicsList, getTopics } from '../controllers/topic.controller.js';
import { getTweets } from '../controllers/tweet.controller.js';
import pool from '../config/db.js';

const router = Router();

// Health check endpoint (also verifies DB connectivity)
router.get('/health', async (req, res) => {
  try {
    const dbCheck = await pool.query('SELECT 1 as connection');
    res.json({
      status: 'UP',
      timestamp: new Date(),
      database: dbCheck.rows[0].connection === 1 ? 'CONNECTED' : 'DISCONNECTED'
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'DOWN',
      timestamp: new Date(),
      database: 'DISCONNECTED',
      error: error.message
    });
  }
});

// KPI & Trend Routes
router.get('/kpis', getKPIs);
router.get('/trends', getTrends);

// Airline Routes
router.get('/airlines/list', getAirlinesList);
router.get('/airlines', getAirlinesSentiment);

// Topic Routes
router.get('/topics/list', getTopicsList);
router.get('/topics', getTopics);

// Tweets Routes
router.get('/tweets', getTweets);

export default router;
