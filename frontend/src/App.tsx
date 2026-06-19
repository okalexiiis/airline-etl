import { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  AlertTriangle,
  Flame
} from 'lucide-react';
import { 
  type DashboardFilters, 
  type KPIData, 
  type TrendDataPoint, 
  type AirlineSentiment, 
  type TopicSentiment, 
  type PaginatedTweets,
  fetchKPIs,
  fetchTrends,
  fetchAirlinesSentiment,
  fetchTopics,
  fetchTweets
} from './services/api';
import { KPICards } from './components/KPICards';
import { FiltersBar } from './components/FiltersBar';
import { ChartsSection } from './components/ChartsSection';
import { TweetsFeed } from './components/TweetsFeed';

function App() {
  // Filter and pagination states
  const [filters, setFilters] = useState<DashboardFilters>({
    airlineId: undefined,
    platformId: undefined,
    topicId: undefined,
    sentiment: undefined,
    startDate: undefined,
    endDate: undefined,
  });
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Data states
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [trends, setTrends] = useState<TrendDataPoint[]>([]);
  const [airlinesSentiment, setAirlinesSentiment] = useState<AirlineSentiment[]>([]);
  const [topicsSentiment, setTopicsSentiment] = useState<TopicSentiment[]>([]);
  const [paginatedTweets, setPaginatedTweets] = useState<PaginatedTweets | null>(null);

  // App loading/error states
  const [loading, setLoading] = useState<boolean>(true);
  const [tweetsLoading, setTweetsLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch general analytics when filters change
  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true);
      setError(null);
      try {
        const [kpiRes, trendRes, airlineRes, topicRes] = await Promise.all([
          fetchKPIs(filters),
          fetchTrends(filters),
          fetchAirlinesSentiment(filters),
          fetchTopics(filters)
        ]);
        setKpis(kpiRes);
        setTrends(trendRes);
        setAirlinesSentiment(airlineRes);
        setTopicsSentiment(topicRes);
      } catch (err: any) {
        console.error('Error fetching analytics:', err);
        setError(err.message || 'Failed to load dashboard statistics. Please verify that the API server is active.');
      } finally {
        setLoading(false);
      }
    };
    loadAnalytics();
  }, [filters]);

  // Fetch tweets separately when filters OR page changes
  useEffect(() => {
    const loadTweetsData = async () => {
      setTweetsLoading(true);
      try {
        const tweetRes = await fetchTweets(filters, currentPage, 8);
        setPaginatedTweets(tweetRes);
      } catch (err) {
        console.error('Error loading tweets:', err);
      } finally {
        setTweetsLoading(false);
      }
    };
    loadTweetsData();
  }, [filters, currentPage]);

  // Manual refresh triggers both concurrently without locking the UI
  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const [kpiRes, trendRes, airlineRes, topicRes, tweetRes] = await Promise.all([
        fetchKPIs(filters),
        fetchTrends(filters),
        fetchAirlinesSentiment(filters),
        fetchTopics(filters),
        fetchTweets(filters, currentPage, 8)
      ]);
      setKpis(kpiRes);
      setTrends(trendRes);
      setAirlinesSentiment(airlineRes);
      setTopicsSentiment(topicRes);
      setPaginatedTweets(tweetRes);
    } catch (err: any) {
      console.error('Error refreshing data:', err);
      setError(err.message || 'Failed to refresh data.');
    } finally {
      setRefreshing(false);
    }
  };

  // Reset page when filters change
  const handleFilterChange = (newFilters: DashboardFilters) => {
    setFilters(newFilters);
    setCurrentPage(1); // Go back to first page
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  return (
    <div className="dashboard-container">
      {/* Header Section */}
      <header className="dashboard-header">
        <div className="brand-group">
          <div className="brand-logo-glow" aria-hidden="true">
            <Flame size={22} color="#ffffff" />
          </div>
          <div>
            <h1 className="brand-title">AeroSent</h1>
            <p className="brand-subtitle">Twitter Airline Sentiment Star-Schema Analyzer</p>
          </div>
        </div>

        <div className="header-actions">
          <button 
            className="btn-refresh" 
            onClick={handleRefresh}
            disabled={loading || refreshing}
            aria-label="Refresh Dashboard Data"
          >
            <RefreshCw 
              size={14} 
              className={refreshing ? 'spin-animation' : ''} 
              style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }}
              aria-hidden="true" 
            />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </header>

      {/* Filters Bar */}
      <FiltersBar filters={filters} onFilterChange={handleFilterChange} />

      {/* Main Viewport */}
      {loading ? (
        <div className="loader-wrapper" aria-busy="true" aria-live="polite">
          <div className="pulse-loader" />
          <p className="brand-subtitle" style={{ letterSpacing: '0.05em' }}>Loading Dashboard Analytics...</p>
        </div>
      ) : error ? (
        <article className="glass-card error-wrapper" role="alert">
          <div className="kpi-icon-wrapper error-icon" style={{ width: '3.5rem', background: 'rgba(244, 63, 94, 0.08)' }} aria-hidden="true">
            <AlertTriangle size={32} />
          </div>
          <h2 className="chart-title" style={{ fontSize: '1.5rem' }}>Failed to Sync Dashboard</h2>
          <p className="brand-subtitle" style={{ maxWidth: '480px', margin: '0 auto' }}>
            {error}
          </p>
          <button className="btn-refresh" onClick={handleRefresh} style={{ marginTop: '1rem' }}>
            Try Again
          </button>
        </article>
      ) : (
        <>
          {/* Metrics summary widgets */}
          <KPICards kpis={kpis} />

          {/* Charts section */}
          <ChartsSection 
            trends={trends} 
            airlines={airlinesSentiment} 
            topics={topicsSentiment} 
          />

          {/* Detailed list explorer */}
          <TweetsFeed 
            paginatedTweets={paginatedTweets}
            currentPage={currentPage}
            onPageChange={handlePageChange}
            loading={tweetsLoading}
          />
        </>
      )}
    </div>
  );
}

export default App;
