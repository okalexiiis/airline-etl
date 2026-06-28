import { Request, Response } from 'express';
import pool from '../config/db.js';
import { buildFilterConditions } from '../utils/queryHelper.js';
import { logger } from '../utils/logger.js';

/**
 * GET /api/airlines/list
 * Returns a simple list of all airlines in the dimension table
 */
export async function getAirlinesList(req: Request, res: Response): Promise<void> {
  try {
    const query = 'SELECT airline_id, airline_name FROM DimAirline ORDER BY airline_name ASC';
    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Error listing airlines');
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve airlines list',
      ...(process.env.NODE_ENV === 'development' ? { error: error.message } : {}),
    });
  }
}

/**
 * GET /api/airlines
 * Returns sentiment comparison statistics grouped by airline
 */
export async function getAirlinesSentiment(req: Request, res: Response): Promise<void> {
  try {
    const { whereClause, values, errors } = buildFilterConditions(req);
    if (errors) {
      res.status(400).json({ success: false, message: 'Invalid filter parameters', errors });
      return;
    }

    const query = `
      SELECT 
        a.airline_id as airline_id,
        a.airline_name as airline_name,
        COUNT(f.fact_id)::int as total_tweets,
        COALESCE(AVG(f.confidence), 0)::float as avg_confidence,
        COUNT(CASE WHEN f.sentiment = 'Positive' THEN 1 END)::int as positive,
        COUNT(CASE WHEN f.sentiment = 'Neutral' THEN 1 END)::int as neutral,
        COUNT(CASE WHEN f.sentiment = 'Negative' THEN 1 END)::int as negative
      FROM FactSentimentAnalysis f
      JOIN DimAirline a ON f.airline_id = a.airline_id
      JOIN DimDate d ON f.date_id = d.date_id
      ${whereClause}
      GROUP BY a.airline_id, a.airline_name
      ORDER BY total_tweets DESC
    `;

    const result = await pool.query(query, values);

    // Calculate percentages for each airline
    const data = result.rows.map((row: any) => {
      const total = row.total_tweets || 1;
      return {
        airlineId: row.airline_id,
        airlineName: row.airline_name,
        totalTweets: row.total_tweets,
        avgConfidence: Math.round(row.avg_confidence * 100) / 100,
        sentimentCounts: {
          positive: row.positive,
          neutral: row.neutral,
          negative: row.negative,
        },
        sentimentPercentages: {
          positive: Math.round((row.positive / total) * 1000) / 10,
          neutral: Math.round((row.neutral / total) * 1000) / 10,
          negative: Math.round((row.negative / total) * 1000) / 10,
        }
      };
    });

    res.json({
      success: true,
      data
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Error fetching airline sentiments');
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve airline sentiment statistics',
      ...(process.env.NODE_ENV === 'development' ? { error: error.message } : {}),
    });
  }
}
