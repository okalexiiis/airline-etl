import { Request, Response } from 'express';
import pool from '../config/db.js';
import { buildFilterConditions } from '../utils/queryHelper.js';

/**
 * GET /api/kpis
 * Returns summary statistics: total tweets, average confidence, sentiment counts
 */
export async function getKPIs(req: Request, res: Response): Promise<void> {
  try {
    const { whereClause, values } = buildFilterConditions(req);

    const query = `
      SELECT 
        COUNT(f.fact_id)::int as total_tweets,
        COALESCE(AVG(f.confidence), 0)::float as avg_confidence,
        COUNT(CASE WHEN f.sentiment = 'Positive' THEN 1 END)::int as positive_count,
        COUNT(CASE WHEN f.sentiment = 'Neutral' THEN 1 END)::int as neutral_count,
        COUNT(CASE WHEN f.sentiment = 'Negative' THEN 1 END)::int as negative_count
      FROM FactSentimentAnalysis f
      LEFT JOIN DimDate d ON f.date_id = d.date_id
      ${whereClause}
    `;

    const result = await pool.query(query, values);
    const kpis = result.rows[0];

    // Calculate percentages
    const total = kpis.total_tweets || 1; // avoid division by zero
    const percentages = {
      positive: Math.round((kpis.positive_count / total) * 1000) / 10,
      neutral: Math.round((kpis.neutral_count / total) * 1000) / 10,
      negative: Math.round((kpis.negative_count / total) * 1000) / 10,
    };

    res.json({
      success: true,
      data: {
        totalTweets: kpis.total_tweets,
        avgConfidence: Math.round(kpis.avg_confidence * 100) / 100, // round to 2 decimals
        sentimentCounts: {
          positive: kpis.positive_count,
          neutral: kpis.neutral_count,
          negative: kpis.negative_count,
        },
        sentimentPercentages: percentages
      }
    });
  } catch (error: any) {
    console.error('Error fetching KPIs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve KPIs statistics',
      error: error.message
    });
  }
}

/**
 * GET /api/trends
 * Returns sentiment counts over time, formatted for charting.
 */
export async function getTrends(req: Request, res: Response): Promise<void> {
  try {
    const { whereClause, values } = buildFilterConditions(req);

    // Get time-series trends grouped by full_date and sentiment
    const query = `
      SELECT 
        d.full_date,
        f.sentiment,
        COUNT(f.fact_id)::int as count
      FROM FactSentimentAnalysis f
      JOIN DimDate d ON f.date_id = d.date_id
      ${whereClause}
      GROUP BY d.full_date, f.sentiment
      ORDER BY d.full_date ASC
    `;

    const result = await pool.query(query, values);

    // Pivot table in JavaScript to shape data for frontend chart libraries (e.g. Recharts)
    // From: [ { full_date, sentiment, count } ]
    // To:   [ { date, positive, neutral, negative, total } ]
    const trendMap: { [dateStr: string]: { date: string; positive: number; neutral: number; negative: number; total: number } } = {};

    result.rows.forEach((row: any) => {
      // format date to YYYY-MM-DD
      const dateObj = new Date(row.full_date);
      const dateStr = dateObj.toISOString().split('T')[0];

      if (!trendMap[dateStr]) {
        trendMap[dateStr] = {
          date: dateStr,
          positive: 0,
          neutral: 0,
          negative: 0,
          total: 0
        };
      }

      const count = Number(row.count);
      const sentimentKey = row.sentiment.toLowerCase() as 'positive' | 'neutral' | 'negative';
      
      if (sentimentKey === 'positive' || sentimentKey === 'neutral' || sentimentKey === 'negative') {
        trendMap[dateStr][sentimentKey] = count;
      }
      trendMap[dateStr].total += count;
    });

    const trendData = Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      success: true,
      data: trendData
    });
  } catch (error: any) {
    console.error('Error fetching trends:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve sentiment trends',
      error: error.message
    });
  }
}
