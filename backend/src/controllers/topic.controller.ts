import { Request, Response } from 'express';
import pool from '../config/db.js';
import { buildFilterConditions } from '../utils/queryHelper.js';

/**
 * GET /api/topics/list
 * Returns a simple list of all topics in the dimension table
 */
export async function getTopicsList(req: Request, res: Response): Promise<void> {
  try {
    const query = 'SELECT topic_id, topic_name FROM DimTopic ORDER BY topic_name ASC';
    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error: any) {
    console.error('Error listing topics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve topics list',
      error: error.message
    });
  }
}

/**
 * GET /api/topics
 * Returns topic breakdown with tweet counts, supporting filters
 */
export async function getTopics(req: Request, res: Response): Promise<void> {
  try {
    const { whereClause, values } = buildFilterConditions(req);

    const query = `
      SELECT 
        t.topic_id as topic_id,
        t.topic_name as topic_name,
        COUNT(f.fact_id)::int as total_tweets,
        COALESCE(AVG(f.confidence), 0)::float as avg_confidence,
        COUNT(CASE WHEN f.sentiment = 'Positive' THEN 1 END)::int as positive,
        COUNT(CASE WHEN f.sentiment = 'Neutral' THEN 1 END)::int as neutral,
        COUNT(CASE WHEN f.sentiment = 'Negative' THEN 1 END)::int as negative
      FROM FactSentimentAnalysis f
      JOIN DimTopic t ON f.topic_id = t.topic_id
      JOIN DimDate d ON f.date_id = d.date_id
      ${whereClause}
      GROUP BY t.topic_id, t.topic_name
      ORDER BY total_tweets DESC
    `;

    const result = await pool.query(query, values);

    const data = result.rows.map((row: any) => {
      const total = row.total_tweets || 1;
      return {
        topicId: row.topic_id,
        topicName: row.topic_name,
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
    console.error('Error fetching topic statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve topics statistics',
      error: error.message
    });
  }
}
