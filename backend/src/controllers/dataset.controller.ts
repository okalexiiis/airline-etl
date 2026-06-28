import { logger } from '../utils/logger.js';
import { Request, Response } from 'express';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const AI_API_KEY = process.env.AI_API_KEY || '';

function aiHeaders(): Record<string, string> {
  const h: Record<string, string> = {};
  if (AI_API_KEY) h['X-API-Key'] = AI_API_KEY;
  return h;
}

/**
 * GET /api/dataset/generate
 * Forwards query params to FastAPI and pipes the streaming CSV response back to the client.
 */
export const generateDataset = async (req: Request, res: Response): Promise<void> => {
  try {
    // Forward all query string params verbatim to FastAPI
    const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
    const url = `${AI_SERVICE_URL}/dataset/generate${queryString ? `?${queryString}` : ''}`;

    const upstream = await fetch(url, {
      method: 'GET',
      headers: aiHeaders(),
      signal: AbortSignal.timeout(120000),
    });

    if (!upstream.ok) {
      const err = await upstream.json().catch(() => ({ detail: 'Dataset generation failed' }));
      res.status(upstream.status).json({ success: false, message: err.detail || 'Dataset generation failed' });
      return;
    }

    // Forward streaming CSV headers
    const contentDisposition = upstream.headers.get('Content-Disposition') || 'attachment; filename="aerosent_dataset.csv"';
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', contentDisposition);

    // Stream the body to the client
    const buf = await upstream.arrayBuffer();
    res.send(Buffer.from(buf));
  } catch (error: any) {
    logger.warn({ err: error }, '[generateDataset] Error:');
    res.status(500).json({
      success: false,
      message: 'Failed to connect to AI service',
      ...(process.env.NODE_ENV === 'development' ? { error: error.message } : {}),
    });
  }
};

/**
 * POST /api/dataset/generate-and-load
 * Forwards the JSON config to FastAPI, runs the ETL pipeline, and returns inserted/skipped counts.
 */
export const generateAndLoad = async (req: Request, res: Response): Promise<void> => {
  try {
    const upstream = await fetch(`${AI_SERVICE_URL}/dataset/generate-and-load`, {
      method: 'POST',
      headers: { ...aiHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
      signal: AbortSignal.timeout(120000),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      res.status(upstream.status).json({ success: false, message: data.detail || 'Generate-and-load failed' });
      return;
    }

    res.json({ success: true, data });
  } catch (error: any) {
    logger.warn({ err: error }, '[generateAndLoad] Error:');
    res.status(500).json({
      success: false,
      message: 'Failed to connect to AI service',
      ...(process.env.NODE_ENV === 'development' ? { error: error.message } : {}),
    });
  }
};
