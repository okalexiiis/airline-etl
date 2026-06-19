import { Request, Response } from 'express';
import { z } from 'zod';
import pool from '../config/db.js';
import { buildFilterConditions } from '../utils/queryHelper.js';

// Schema validation for query parameters
const GetTweetsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

/**
 * GET /api/tweets
 * Returns a paginated list of tweets with details and dimensions, supporting filters
 */
export async function getTweets(req: Request, res: Response): Promise<void> {
  try {
    // Validate request query parameters for pagination
    const parsed = GetTweetsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: 'Invalid pagination query parameters',
        errors: parsed.error.format()
      });
      return;
    }

    const { page, limit } = parsed.data;
    const offset = (page - 1) * limit;

    // Get filter conditions (for joins with FactSentimentAnalysis and DimDate)
    const { whereClause, values } = buildFilterConditions(req, 1);

    // 1. Query the total count of matching records for pagination metadata
    const countQuery = `
      SELECT COUNT(f.fact_id)::int as total
      FROM FactSentimentAnalysis f
      JOIN DimDate d ON f.date_id = d.date_id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, values);
    const total = countResult.rows[0]?.total || 0;

    // 2. Query the actual records, joining all dimensions
    const limitParamIdx = values.length + 1;
    const offsetParamIdx = values.length + 2;
    const listQuery = `
      SELECT 
        f.fact_id as fact_id,
        f.tweet_text as tweet_text,
        f.tweet_text_clean as tweet_text_clean,
        f.sentiment as sentiment,
        f.confidence as confidence,
        a.airline_name as airline,
        p.platform_name as platform,
        t.topic_name as topic,
        d.full_date as date
      FROM FactSentimentAnalysis f
      JOIN DimAirline a ON f.airline_id = a.airline_id
      JOIN DimPlatform p ON f.platform_id = p.platform_id
      JOIN DimTopic t ON f.topic_id = t.topic_id
      JOIN DimDate d ON f.date_id = d.date_id
      ${whereClause}
      ORDER BY f.fact_id DESC
      LIMIT $${limitParamIdx} OFFSET $${offsetParamIdx}
    `;

    const listValues = [...values, limit, offset];
    const listResult = await pool.query(listQuery, listValues);

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: listResult.rows,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error: any) {
    console.error('Error fetching tweets:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve tweets list',
      error: error.message
    });
  }
}
