const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface DashboardFilters {
  airlineId?: string;
  platformId?: string;
  topicId?: string;
  sentiment?: string;
  startDate?: string;
  endDate?: string;
}

export interface KPIData {
  totalTweets: number;
  avgConfidence: number;
  sentimentCounts: {
    positive: number;
    neutral: number;
    negative: number;
  };
  sentimentPercentages: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

export interface TrendDataPoint {
  date: string;
  positive: number;
  neutral: number;
  negative: number;
  total: number;
}

export interface AirlineSentiment {
  airlineId: number;
  airlineName: string;
  totalTweets: number;
  avgConfidence: number;
  sentimentCounts: {
    positive: number;
    neutral: number;
    negative: number;
  };
  sentimentPercentages: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

export interface TopicSentiment {
  topicId: number;
  topicName: string;
  totalTweets: number;
  avgConfidence: number;
  sentimentCounts: {
    positive: number;
    neutral: number;
    negative: number;
  };
  sentimentPercentages: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

export interface Tweet {
  fact_id: number;
  tweet_text: string;
  tweet_text_clean: string;
  sentiment: string;
  confidence: number;
  airline: string;
  platform: string;
  topic: string;
  date: string;
}

export interface PaginatedTweets {
  data: Tweet[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

function buildQueryString(filters: DashboardFilters, extraParams?: Record<string, string | number>): string {
  const params = new URLSearchParams();

  // Add filters
  if (filters.airlineId) params.append('airlineId', filters.airlineId);
  if (filters.platformId) params.append('platformId', filters.platformId);
  if (filters.topicId) params.append('topicId', filters.topicId);
  if (filters.sentiment) params.append('sentiment', filters.sentiment);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);

  // Add extras
  if (extraParams) {
    Object.entries(extraParams).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        params.append(key, String(val));
      }
    });
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}

export async function fetchKPIs(filters: DashboardFilters): Promise<KPIData> {
  const response = await fetch(`${API_BASE_URL}/kpis${buildQueryString(filters)}`);
  if (!response.ok) throw new Error('Failed to fetch KPIs');
  const result = await response.json();
  return result.data;
}

export async function fetchTrends(filters: DashboardFilters): Promise<TrendDataPoint[]> {
  const response = await fetch(`${API_BASE_URL}/trends${buildQueryString(filters)}`);
  if (!response.ok) throw new Error('Failed to fetch sentiment trends');
  const result = await response.json();
  return result.data;
}

export async function fetchAirlinesList(): Promise<Array<{ airline_id: number; airline_name: string }>> {
  const response = await fetch(`${API_BASE_URL}/airlines/list`);
  if (!response.ok) throw new Error('Failed to fetch airlines list');
  const result = await response.json();
  return result.data;
}

export async function fetchAirlinesSentiment(filters: DashboardFilters): Promise<AirlineSentiment[]> {
  const response = await fetch(`${API_BASE_URL}/airlines${buildQueryString(filters)}`);
  if (!response.ok) throw new Error('Failed to fetch airline sentiments');
  const result = await response.json();
  return result.data;
}

export async function fetchTopicsList(): Promise<Array<{ topic_id: number; topic_name: string }>> {
  const response = await fetch(`${API_BASE_URL}/topics/list`);
  if (!response.ok) throw new Error('Failed to fetch topics list');
  const result = await response.json();
  return result.data;
}

export async function fetchTopics(filters: DashboardFilters): Promise<TopicSentiment[]> {
  const response = await fetch(`${API_BASE_URL}/topics${buildQueryString(filters)}`);
  if (!response.ok) throw new Error('Failed to fetch topic sentiments');
  const result = await response.json();
  return result.data;
}

export async function fetchTweets(filters: DashboardFilters, page = 1, limit = 10): Promise<PaginatedTweets> {
  const response = await fetch(`${API_BASE_URL}/tweets${buildQueryString(filters, { page, limit })}`);
  if (!response.ok) throw new Error('Failed to fetch tweets');
  const result = await response.json();
  return result;
}
