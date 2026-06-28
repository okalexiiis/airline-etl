import { Router } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { getKPIs, getTrends } from '../controllers/sentiment.controller.js';
import { getAirlinesList, getAirlinesSentiment } from '../controllers/airline.controller.js';
import { getTopicsList, getTopics } from '../controllers/topic.controller.js';
import { getTweets } from '../controllers/tweet.controller.js';
import { analyzeText, uploadDataset } from '../controllers/ai.controller.js';
import { generateDataset, generateAndLoad } from '../controllers/dataset.controller.js';
import pool from '../config/db.js';
import { requireAuth, requireAdmin } from '../utils/auth-middleware.js';

const router = Router();

// Rate limiter for admin endpoints (NLP inference + ETL + dataset generation)
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { success: false, message: 'Too many requests. Try again later.' },
});

// Configure multer in-memory storage for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
});

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
      ...(process.env.NODE_ENV === 'development' ? { error: error.message } : {}),
    });
  }
});

// KPI & Trend Routes (Protected - Viewer / Admin)
router.get('/kpis', requireAuth, getKPIs);
router.get('/trends', requireAuth, getTrends);

// Airline Routes (Protected - Viewer / Admin)
router.get('/airlines/list', requireAuth, getAirlinesList);
router.get('/airlines', requireAuth, getAirlinesSentiment);

// Topic Routes (Protected - Viewer / Admin)
router.get('/topics/list', requireAuth, getTopicsList);
router.get('/topics', requireAuth, getTopics);

// Tweets Routes (Protected - Viewer / Admin)
router.get('/tweets', requireAuth, getTweets);

// AI / NLP & ETL Ingestion Routes (Restricted - Admin Only, Rate Limited)
router.post('/analyze', requireAdmin, adminLimiter, analyzeText);
router.post('/etl/upload', requireAdmin, adminLimiter, upload.single('dataset'), uploadDataset);

// Dataset Generator Routes (Restricted - Admin Only, Rate Limited)
router.get('/dataset/generate', requireAdmin, adminLimiter, generateDataset);
router.post('/dataset/generate-and-load', requireAdmin, adminLimiter, generateAndLoad);

export default router;

