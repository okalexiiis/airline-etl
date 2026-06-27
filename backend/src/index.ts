import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { toNodeHandler } from 'better-auth/node';
import apiRoutes from './routes/api.routes.js';
import { auth } from './config/auth.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS with support for credentials and dynamic localhost origin matching
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, postman, curl)
    if (!origin) return callback(null, true);
    
    // Match any local development origin (e.g. localhost:5173, localhost:5174)
    const isLocalhost = /^http:\/\/localhost(:\d+)?$/.test(origin);
    if (isLocalhost) {
      callback(null, true);
    } else {
      callback(null, false); // Block other origins
    }
  },
  credentials: true
}));

// Mount better-auth handlers BEFORE express.json() parser consumes the raw request stream
app.all('/api/auth/{*splat}', toNodeHandler(auth));

// Enable parsing JSON bodies
app.use(express.json());


// Simple custom request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${req.method}] ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Bind API routes under '/api' prefix
app.use('/api', apiRoutes);

// Root route welcome message
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the Twitter Airline Sentiment Dashboard API',
    endpoints: {
      health: '/api/health',
      kpis: '/api/kpis',
      trends: '/api/trends',
      airlinesList: '/api/airlines/list',
      airlinesSentiment: '/api/airlines',
      topicsList: '/api/topics/list',
      topicsSentiment: '/api/topics',
      tweets: '/api/tweets',
    }
  });
});

// 404 Route handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    message: 'An internal server error occurred',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start listening for incoming traffic
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`🚀 Airline Sentiment API is running on port ${PORT}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`==================================================`);
});
