import { logger } from '../utils/logger.js';
import { Request, Response } from 'express';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const AI_API_KEY = process.env.AI_API_KEY || '';

function aiHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (AI_API_KEY) h['X-API-Key'] = AI_API_KEY;
  return h;
}

/**
 * POST /api/analyze
 * Forwards text to Python NLP service for analysis.
 */
export async function analyzeText(req: Request, res: Response): Promise<void> {
  try {
    const { text, airline, topic } = req.body;

    if (!text || typeof text !== 'string' || text.trim() === '') {
      res.status(400).json({
        success: false,
        message: 'Invalid request: "text" field is required and must be a non-empty string.',
      });
      return;
    }

    if (text.length > 560) {
      res.status(400).json({
        success: false,
        message: 'Invalid request: "text" field exceeds maximum length of 560 characters.',
      });
      return;
    }

    // Call Python FastAPI analyze endpoint
    const response = await fetch(`${AI_SERVICE_URL}/analyze`, {
      method: 'POST',
      headers: aiHeaders(),
      body: JSON.stringify({ text, airline, topic }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      res.status(response.status).json({
        success: false,
        message: 'NLP Service error',
        error: errorData.detail || 'Failed to analyze text from the NLP service',
      });
      return;
    }

    const data = await response.json();
    res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Error contacting NLP service:');
    res.status(503).json({
      success: false,
      message: 'NLP Service is currently unavailable.',
      ...(process.env.NODE_ENV === 'development' ? { error: error.message } : {}),
    });
  }
}

/**
 * POST /api/etl/upload
 * Forwards CSV file to Python NLP service for database ingestion.
 */
export async function uploadDataset(req: Request, res: Response): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'Invalid request: No CSV file uploaded under the "dataset" field.',
      });
      return;
    }

    // Prepare multipart form data for FastAPI forwarding
    const formData = new FormData();
    const blob = new Blob([req.file.buffer as any], { type: req.file.mimetype });
    formData.append('file', blob, req.file.originalname);

    // Call Python FastAPI etl/run endpoint
    const response = await fetch(`${AI_SERVICE_URL}/etl/run`, {
      method: 'POST',
      body: formData,
      headers: AI_API_KEY ? { 'X-API-Key': AI_API_KEY } : {},
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      res.status(response.status).json({
        success: false,
        message: 'ETL Pipeline ingestion failed',
        error: errorData.detail || 'An error occurred during dataset processing on the NLP service',
      });
      return;
    }

    const data = await response.json();
    res.json({
      success: true,
      message: 'Dataset uploaded and processed successfully',
      data,
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Error forwarding dataset to NLP service:');
    res.status(503).json({
      success: false,
      message: 'NLP service is currently unavailable.',
      ...(process.env.NODE_ENV === 'development' ? { error: error.message } : {}),
    });
  }
}
