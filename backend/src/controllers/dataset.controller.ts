import { Request, Response } from 'express';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

/**
 * GET /api/dataset/generate
 * Forwards query params to FastAPI and pipes the streaming CSV response back to the client.
 */
export const generateDataset = async (req: Request, res: Response): Promise<void> => {
  try {
    // Forward all query string params verbatim to FastAPI
    const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
    const url = `${AI_SERVICE_URL}/dataset/generate${queryString ? `?${queryString}` : ''}`;

    const upstream = await fetch(url, { method: 'GET' });

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
    console.error('[generateDataset] Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to connect to AI service' });
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      res.status(upstream.status).json({ success: false, message: data.detail || 'Generate-and-load failed' });
      return;
    }

    res.json({ success: true, data });
  } catch (error: any) {
    console.error('[generateAndLoad] Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to connect to AI service' });
  }
};
