import { Request } from 'express';
import { z } from 'zod';

export interface FilterResult {
  whereClause: string;
  values: any[];
  errors?: Record<string, string[]>;
}

const FilterSchema = z.object({
  airlineId: z.coerce.number().int().positive().optional(),
  platformId: z.coerce.number().int().positive().optional(),
  topicId: z.coerce.number().int().positive().optional(),
  sentiment: z.enum(['Positive', 'Neutral', 'Negative']).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format').optional(),
});

/**
 * Dynamically builds a WHERE clause and parameter values array for queries
 * that join FactSentimentAnalysis f with DimDate d.
 */
export function buildFilterConditions(req: Request, startParamIndex: number = 1): FilterResult {
  const parsed = FilterSchema.safeParse(req.query);
  if (!parsed.success) {
    return {
      whereClause: '',
      values: [],
      errors: Object.fromEntries(
        Object.entries(parsed.error.flatten().fieldErrors).map(([k, v]) => [k, v ?? []])
      ),
    };
  }

  const { airlineId, platformId, topicId, startDate, endDate, sentiment } = parsed.data;
  const conditions: string[] = [];
  const values: any[] = [];
  let paramIndex = startParamIndex;

  if (airlineId) {
    conditions.push(`f.airline_id = $${paramIndex++}`);
    values.push(airlineId);
  }
  if (platformId) {
    conditions.push(`f.platform_id = $${paramIndex++}`);
    values.push(platformId);
  }
  if (topicId) {
    conditions.push(`f.topic_id = $${paramIndex++}`);
    values.push(topicId);
  }
  if (sentiment) {
    conditions.push(`f.sentiment = $${paramIndex++}`);
    values.push(sentiment);
  }
  if (startDate) {
    conditions.push(`d.full_date >= $${paramIndex++}`);
    values.push(startDate);
  }
  if (endDate) {
    conditions.push(`d.full_date <= $${paramIndex++}`);
    values.push(endDate);
  }

  return {
    whereClause: conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '',
    values,
  };
}
