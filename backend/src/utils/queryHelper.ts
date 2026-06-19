import { Request } from 'express';

export interface FilterResult {
  whereClause: string;
  values: any[];
}

/**
 * Dynamically builds a WHERE clause and parameter values array for queries
 * that join FactSentimentAnalysis f with DimDate d.
 */
export function buildFilterConditions(req: Request, startParamIndex: number = 1): FilterResult {
  const { airlineId, platformId, topicId, startDate, endDate, sentiment } = req.query;
  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = startParamIndex;

  if (airlineId) {
    conditions.push(`f.airline_id = $${paramIndex++}`);
    values.push(Number(airlineId));
  }
  if (platformId) {
    conditions.push(`f.platform_id = $${paramIndex++}`);
    values.push(Number(platformId));
  }
  if (topicId) {
    conditions.push(`f.topic_id = $${paramIndex++}`);
    values.push(Number(topicId));
  }
  if (sentiment) {
    conditions.push(`f.sentiment = $${paramIndex++}`);
    values.push(String(sentiment));
  }
  if (startDate) {
    conditions.push(`d.full_date >= $${paramIndex++}`);
    values.push(String(startDate));
  }
  if (endDate) {
    conditions.push(`d.full_date <= $${paramIndex++}`);
    values.push(String(endDate));
  }

  return {
    whereClause: conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '',
    values,
  };
}
