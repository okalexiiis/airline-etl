import { describe, it, expect } from 'vitest';
import { buildFilterConditions } from '../queryHelper.js';

function mockReq(query: Record<string, string | string[]>) {
  return { query } as any;
}

describe('buildFilterConditions', () => {
  it('returns empty whereClause and empty values with no filters', () => {
    const { whereClause, values, errors } = buildFilterConditions(mockReq({}));
    expect(whereClause).toBe('');
    expect(values).toEqual([]);
    expect(errors).toBeUndefined();
  });

  it('validates and uses airlineId', () => {
    const { whereClause, values, errors } = buildFilterConditions(mockReq({ airlineId: '3' }));
    expect(errors).toBeUndefined();
    expect(whereClause).toBe('WHERE f.airline_id = $1');
    expect(values).toEqual([3]);
  });

  it('returns errors for non-numeric airlineId', () => {
    const { errors } = buildFilterConditions(mockReq({ airlineId: 'abc' }));
    expect(errors).toBeDefined();
    expect(errors!.airlineId).toBeDefined();
  });

  it('validates sentiment enum', () => {
    const { whereClause, values } = buildFilterConditions(mockReq({ sentiment: 'Positive' }));
    expect(whereClause).toBe('WHERE f.sentiment = $1');
    expect(values).toEqual(['Positive']);
  });

  it('returns errors for invalid sentiment', () => {
    const { errors } = buildFilterConditions(mockReq({ sentiment: 'Foo' }));
    expect(errors).toBeDefined();
    expect(errors!.sentiment).toBeDefined();
  });

  it('validates startDate format (YYYY-MM-DD)', () => {
    const { whereClause, values, errors } = buildFilterConditions(mockReq({ startDate: '2024-01-15' }));
    expect(errors).toBeUndefined();
    expect(whereClause).toBe('WHERE d.full_date >= $1');
    expect(values).toEqual(['2024-01-15']);
  });

  it('returns errors for invalid date format', () => {
    const { errors } = buildFilterConditions(mockReq({ startDate: '01-15-2024' }));
    expect(errors).toBeDefined();
    expect(errors!.startDate).toBeDefined();
  });

  it('combines multiple filters with correct paramIndex', () => {
    const { whereClause, values, errors } = buildFilterConditions(mockReq({
      airlineId: '1',
      sentiment: 'Negative',
      startDate: '2024-01-01',
    }));
    expect(errors).toBeUndefined();
    expect(whereClause).toBe('WHERE f.airline_id = $1 AND f.sentiment = $2 AND d.full_date >= $3');
    expect(values).toEqual([1, 'Negative', '2024-01-01']);
  });
});
