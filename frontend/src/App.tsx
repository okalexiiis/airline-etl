import { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  AlertTriangle,
  Flame,
  LogOut,
  User as UserIcon
} from 'lucide-react';
import { 
  type DashboardFilters, 
  type KPIData, 
  type PaginatedTweets,
  type AirlineSentiment,
  type TrendDataPoint,
  type TopicSentiment,
  fetchKPIs,
  fetchTweets,
  fetchAirlinesSentiment,
  fetchTrends,
  fetchTopics
} from './services/api';
import { ContextBar, type ContextFilters } from './components/ContextBar';
import { FiltersBar, type ExploreFilters } from './components/FiltersBar';
import { KPICards } from './components/KPICards';
import { AlertsPanel } from './components/AlertsPanel';
import { DashboardCharts } from './components/DashboardCharts';
import { TweetsFeed } from './components/TweetsFeed';
import { NLPPlayground } from './components/NLPPlayground';
import { DatasetGenerator } from './components/DatasetGenerator';
import { AuthPage } from './components/AuthPage';
import { authClient } from './services/auth.client';

function App() {
  const { data: sessionData, isPending: sessionLoading, refetch: refetchSession } = authClient.useSession();
  const user = sessionData?.user as any;
  const isAdmin = user?.role === 'Admin';

  const [view, setView] = useState<'dashboard' | 'explore' | 'playground' | 'generator'>('dashboard');

  useEffect(() => {
    if (user && user.role !== 'Admin' && view === 'generator') {
      setView('dashboard');
    }
  }, [user, view]);

  // Shared context: airline + date range
  const [contextFilters, setContextFilters] = useState<ContextFilters>({
    airlineId: undefined,
    startDate: undefined,
    endDate: undefined,
  });

  // Explore-local: sentiment + topic
  const [exploreFilters, setExploreFilters] = useState<ExploreFilters>({
    sentiment: undefined,
    topicId: undefined,
  });

  const [currentPage, setCurrentPage] = useState<number>(1);

  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [airlinesSentiment, setAirlinesSentiment] = useState<AirlineSentiment[]>([]);
  const [trends, setTrends] = useState<TrendDataPoint[]>([]);
  const [topicsSentiment, setTopicsSentiment] = useState<TopicSentiment[]>([]);
  const [paginatedTweets, setPaginatedTweets] = useState<PaginatedTweets | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [tweetsLoading, setTweetsLoading] = useState<boolean>(false);
  const [tweetError, setTweetError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Dashboard analytics depend on contextFilters only
  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true);
      setError(null);
      try {
        const analyticsFilters: DashboardFilters = {
          airlineId: contextFilters.airlineId,
          startDate: contextFilters.startDate,
          endDate: contextFilters.endDate,
        };
        const [kpiRes, airlineRes, trendRes, topicRes] = await Promise.all([
          fetchKPIs(analyticsFilters),
          fetchAirlinesSentiment(analyticsFilters),
          fetchTrends(analyticsFilters),
          fetchTopics(analyticsFilters)
        ]);
        setKpis(kpiRes);
        setAirlinesSentiment(airlineRes);
        setTrends(trendRes);
        setTopicsSentiment(topicRes);
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard statistics.');
      } finally {
        setLoading(false);
      }
    };
    loadAnalytics();
  }, [contextFilters]);

  // Tweets depend on contextFilters + exploreFilters + page
  useEffect(() => {
    const loadTweetsData = async () => {
      setTweetsLoading(true);
      setTweetError(null);
      try {
        const merged: DashboardFilters = {
          airlineId: contextFilters.airlineId,
          startDate: contextFilters.startDate,
          endDate: contextFilters.endDate,
          sentiment: exploreFilters.sentiment,
          topicId: exploreFilters.topicId,
        };
        const tweetRes = await fetchTweets(merged, currentPage, 8);
        setPaginatedTweets(tweetRes);
      } catch (err: any) {
        setTweetError(err.message || 'Failed to load tweet data.');
      } finally {
        setTweetsLoading(false);
      }
    };
    loadTweetsData();
  }, [contextFilters, exploreFilters, currentPage]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    setTweetError(null);
    try {
      const analyticsFilters: DashboardFilters = {
        airlineId: contextFilters.airlineId,
        startDate: contextFilters.startDate,
        endDate: contextFilters.endDate,
      };
      const tweetFilters: DashboardFilters = {
        ...analyticsFilters,
        sentiment: exploreFilters.sentiment,
        topicId: exploreFilters.topicId,
      };
      const [kpiRes, airlineRes, trendRes, topicRes, tweetRes] = await Promise.all([
        fetchKPIs(analyticsFilters),
        fetchAirlinesSentiment(analyticsFilters),
        fetchTrends(analyticsFilters),
        fetchTopics(analyticsFilters),
        fetchTweets(tweetFilters, currentPage, 8)
      ]);
      setKpis(kpiRes);
      setAirlinesSentiment(airlineRes);
      setTrends(trendRes);
      setTopicsSentiment(topicRes);
      setPaginatedTweets(tweetRes);
    } catch (err: any) {
      setError(err.message || 'Failed to refresh data.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleContextChange = (newCtx: ContextFilters) => {
    setContextFilters(newCtx);
    setCurrentPage(1);
  };

  const handleExploreChange = (newExplore: ExploreFilters) => {
    setExploreFilters(newExplore);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  if (sessionLoading) {
    return (
      <div className="loader-wrapper" aria-busy="true" aria-live="polite">
        <div className="pulse-loader" />
        <p className="brand-subtitle" style={{ letterSpacing: '0.05em' }}>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthPage onLoginSuccess={refetchSession} />;
  }

  const showRefresh = view === 'dashboard' || view === 'explore';

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="brand-group">
          <div className="brand-logo-glow" aria-hidden="true">
            <Flame size={22} color="#ffffff" />
          </div>
          <div>
            <h1 className="brand-title">AeroSent</h1>
            <p className="brand-subtitle">Sentiment Analytics</p>
          </div>
        </div>

        <div className="header-actions">
          <nav className="minimal-nav" aria-label="Main navigation">
            <button
              className={`nav-link${view === 'dashboard' ? ' active' : ''}`}
              onClick={() => setView('dashboard')}
              aria-current={view === 'dashboard' ? 'page' : undefined}
            >
              Dashboard
            </button>
            <button
              className={`nav-link${view === 'explore' ? ' active' : ''}`}
              onClick={() => setView('explore')}
              aria-current={view === 'explore' ? 'page' : undefined}
            >
              Explore
            </button>
            <button
              className={`nav-link${view === 'playground' ? ' active' : ''}`}
              onClick={() => setView('playground')}
              aria-current={view === 'playground' ? 'page' : undefined}
            >
              NLP Playground
            </button>
            {isAdmin && (
              <button
                className={`nav-link${view === 'generator' ? ' active' : ''}`}
                onClick={() => setView('generator')}
                aria-current={view === 'generator' ? 'page' : undefined}
              >
                Dataset Manager
              </button>
            )}
          </nav>

          <div className="user-profile-badge">
            <div className="user-icon-circle">
              <UserIcon size={12} color="#ffffff" />
            </div>
            <span className="user-profile-name">
              {user.name} <span className="user-profile-role">{user.role}</span>
            </span>
            <button 
              className="btn-signout"
              onClick={async () => {
                await authClient.signOut();
                refetchSession();
              }}
              title="Sign Out"
            >
              <LogOut size={12} />
              Sign Out
            </button>
          </div>

          {showRefresh && (
          <button 
            className="btn-refresh" 
            onClick={handleRefresh}
            disabled={loading || refreshing}
            aria-label="Refresh data"
          >
            <RefreshCw 
              size={14} 
              className={refreshing ? 'spin-animation' : ''} 
              aria-hidden="true" 
            />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          )}
        </div>
      </header>

      {/* Shared context bar */}
      {(view === 'dashboard' || view === 'explore') && (
        <ContextBar filters={contextFilters} onChange={handleContextChange} />
      )}

      {view === 'playground' && <NLPPlayground />}
      {view === 'generator' && <DatasetGenerator />}

      {view === 'dashboard' && (
        error ? (
        <article className="glass-card error-wrapper" role="alert">
          <div className="kpi-icon-wrapper error-icon error-banner-icon" aria-hidden="true">
            <AlertTriangle size={32} />
          </div>
          <h2 className="chart-title error-banner-title">Failed to Sync Dashboard</h2>
          <p className="brand-subtitle error-banner-desc">
            {error}
          </p>
          <button className="btn-refresh error-banner-btn" onClick={handleRefresh}>
            Try Again
          </button>
        </article>
      ) : (
        <>
          <KPICards kpis={kpis} loading={loading} />
          <AlertsPanel
            airlinesSentiment={airlinesSentiment}
            onSelectAirline={(id) => handleContextChange({ ...contextFilters, airlineId: id })}
            activeAirlineId={contextFilters.airlineId}
            loading={loading}
          />
          <DashboardCharts trends={trends} topics={topicsSentiment} airlines={airlinesSentiment} kpis={kpis} loading={loading} />
        </>
      )
      )}

      {view === 'explore' && (
        <>
          <FiltersBar filters={exploreFilters} onChange={handleExploreChange} />
          <TweetsFeed 
            paginatedTweets={paginatedTweets}
            currentPage={currentPage}
            onPageChange={handlePageChange}
            loading={tweetsLoading}
            error={tweetError}
          />
        </>
      )}
    </div>
  );
}

export default App;
