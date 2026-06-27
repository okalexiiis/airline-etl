const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Custom fetch wrapper to automatically attach session credentials (cookies)
 * for cross-origin authentication checks.
 */
async function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...init,
    credentials: 'include',
  });
}

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
  const response = await apiFetch(`${API_BASE_URL}/kpis${buildQueryString(filters)}`);
  if (!response.ok) throw new Error('Failed to fetch KPIs');
  const result = await response.json();
  return result.data;
}

export async function fetchTrends(filters: DashboardFilters): Promise<TrendDataPoint[]> {
  const response = await apiFetch(`${API_BASE_URL}/trends${buildQueryString(filters)}`);
  if (!response.ok) throw new Error('Failed to fetch sentiment trends');
  const result = await response.json();
  return result.data;
}

export async function fetchAirlinesList(): Promise<Array<{ airline_id: number; airline_name: string }>> {
  const response = await apiFetch(`${API_BASE_URL}/airlines/list`);
  if (!response.ok) throw new Error('Failed to fetch airlines list');
  const result = await response.json();
  return result.data;
}

export async function fetchAirlinesSentiment(filters: DashboardFilters): Promise<AirlineSentiment[]> {
  const response = await apiFetch(`${API_BASE_URL}/airlines${buildQueryString(filters)}`);
  if (!response.ok) throw new Error('Failed to fetch airline sentiments');
  const result = await response.json();
  return result.data;
}

export async function fetchTopicsList(): Promise<Array<{ topic_id: number; topic_name: string }>> {
  const response = await apiFetch(`${API_BASE_URL}/topics/list`);
  if (!response.ok) throw new Error('Failed to fetch topics list');
  const result = await response.json();
  return result.data;
}

export async function fetchTopics(filters: DashboardFilters): Promise<TopicSentiment[]> {
  const response = await apiFetch(`${API_BASE_URL}/topics${buildQueryString(filters)}`);
  if (!response.ok) throw new Error('Failed to fetch topic sentiments');
  const result = await response.json();
  return result.data;
}

export async function fetchTweets(filters: DashboardFilters, page = 1, limit = 10): Promise<PaginatedTweets> {
  const response = await apiFetch(`${API_BASE_URL}/tweets${buildQueryString(filters, { page, limit })}`);
  if (!response.ok) throw new Error('Failed to fetch tweets');
  const result = await response.json();
  return result;
}

export interface AnalyzeResult {
  cleaned_text: string;
  sentiment: 'Positive' | 'Neutral' | 'Negative';
  confidence: number;
}

export async function analyzeText(text: string, airline?: string, topic?: string): Promise<AnalyzeResult> {
  const response = await apiFetch(`${API_BASE_URL}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, airline, topic }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to analyze text');
  }
  const result = await response.json();
  return result.data;
}

// ─── Dataset Generator ────────────────────────────────────────────────────────

export interface DatasetConfig {
  n_records: number;
  airlines: string[];
  sentiment_positive: number;
  sentiment_neutral: number;
  sentiment_negative: number;
  topics: string[];
  start_date: string;
  end_date: string;
}

export interface GenerateAndLoadResult {
  inserted: number;
  skipped: number;
  generated: number;
}

function buildDatasetQueryString(config: DatasetConfig): string {
  const params = new URLSearchParams();
  params.set('n_records', String(config.n_records));
  if (config.airlines.length > 0) params.set('airlines', config.airlines.join(','));
  params.set('sentiment_positive', String(config.sentiment_positive));
  params.set('sentiment_neutral', String(config.sentiment_neutral));
  params.set('sentiment_negative', String(config.sentiment_negative));
  if (config.topics.length > 0) params.set('topics', config.topics.join(','));
  if (config.start_date) params.set('start_date', config.start_date);
  if (config.end_date) params.set('end_date', config.end_date);
  return params.toString();
}

/**
 * Fetch a small CSV preview (10 rows) and return parsed rows.
 */
export async function previewDataset(config: DatasetConfig): Promise<string[][]> {
  const previewConfig = { ...config, n_records: 10 };
  const qs = buildDatasetQueryString(previewConfig);
  const response = await apiFetch(`${API_BASE_URL}/dataset/generate?${qs}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Preview failed');
  }
  const text = await response.text();
  // Parse CSV into rows
  return text.trim().split('\n').map((line) =>
    line.split(',').map((cell) => cell.replace(/^"|"$/g, '').trim())
  );
}

/**
 * Trigger a file download of the generated CSV in the browser.
 */
export function downloadDataset(config: DatasetConfig): void {
  const qs = buildDatasetQueryString(config);
  const url = `${API_BASE_URL}/dataset/generate?${qs}`;
  const link = document.createElement('a');
  link.href = url;
  link.download = `aerosent_dataset_${config.n_records}rows.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generate a dataset in-memory and load it directly into the database.
 */
export async function generateAndLoad(config: DatasetConfig): Promise<GenerateAndLoadResult> {
  const response = await apiFetch(`${API_BASE_URL}/dataset/generate-and-load`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Generate-and-load failed');
  }
  const result = await response.json();
  return result.data;
}

export interface UploadResult {
  inserted: number;
  skipped: number;
}

/**
 * Upload a CSV dataset file to the backend to run the ETL pipeline.
 */
export async function uploadDatasetFile(file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('dataset', file);

  const response = await apiFetch(`${API_BASE_URL}/etl/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || err.error || 'Failed to upload dataset');
  }

  const result = await response.json();
  return result.data;
}
