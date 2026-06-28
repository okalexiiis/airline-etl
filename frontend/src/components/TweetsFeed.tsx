import React from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle
} from 'lucide-react';
import type { PaginatedTweets } from '../services/api';

interface TweetsFeedProps {
  paginatedTweets: PaginatedTweets | null;
  currentPage: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
  error?: string | null;
}

const SkeletonRow: React.FC = () => (
  <tr className="skeleton-pulse">
    <td className="tweet-text-cell">
      <div className="skeleton-cell wide" />
    </td>
    <td><div className="skeleton-cell medium" /></td>
    <td><div className="skeleton-cell short" /></td>
    <td><div className="skeleton-cell short" /></td>
    <td><div className="skeleton-cell short" /></td>
    <td><div className="skeleton-cell short" /></td>
    <td><div className="skeleton-cell short" /></td>
  </tr>
);

const TweetsSkeleton: React.FC = () => (
  <div className="tweets-table-container">
    <table className="tweets-skeleton-table">
      <thead>
        <tr>
          <th scope="col">Tweet Content</th>
          <th scope="col">Sentiment</th>
          <th scope="col">Confidence</th>
          <th scope="col">Airline</th>
          <th scope="col">Topic</th>
          <th scope="col">Origin</th>
          <th scope="col">Date</th>
        </tr>
      </thead>
      <tbody>
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </tbody>
    </table>
  </div>
);

const EmptyFeedState: React.FC = () => (
  <div className="tweets-empty-state">
    <h3 className="empty-title">No matching records found</h3>
    <p className="empty-subtitle">Try modifying your filter criteria or generate a dataset to populate the feed.</p>
  </div>
);

const ErrorFeedState: React.FC<{ message: string }> = ({ message }) => (
  <div className="tweets-error-state">
    <AlertCircle size={28} className="error-icon" aria-hidden="true" />
    <h3 className="error-title">Failed to load tweets</h3>
    <p className="error-subtitle">{message}</p>
  </div>
);

export const TweetsFeed: React.FC<TweetsFeedProps> = ({ 
  paginatedTweets, 
  currentPage, 
  onPageChange,
  loading = false,
  error = null
}) => {
  if (error && !paginatedTweets) {
    return (
      <section className="glass-card tweets-section" aria-label="Tweets detailed list">
        <div className="chart-title-group" style={{ marginBottom: '0.5rem' }}>
          <div>
            <h2 className="chart-title">Tweets</h2>
          </div>
        </div>
        <ErrorFeedState message={error} />
      </section>
    );
  }

  if (loading) {
    return (
      <section className="glass-card tweets-section" aria-label="Tweets detailed list" aria-busy="true">
        <div className="chart-title-group" style={{ marginBottom: '0.5rem' }}>
          <div>
            <h2 className="chart-title">Tweets</h2>
          </div>
        </div>
        <TweetsSkeleton />
      </section>
    );
  }

  if (!paginatedTweets) return null;

  const { data: tweets, pagination } = paginatedTweets;

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getConfidenceStyle = (score: number) => {
    if (score >= 0.85) return { color: 'var(--color-positive)', fontWeight: 600 };
    if (score >= 0.6) return { color: 'var(--color-neutral)', fontWeight: 600 };
    return { color: 'var(--color-negative)', fontWeight: 600 };
  };

  return (
    <section className="glass-card tweets-section" aria-label="Tweets detailed list">
      <div className="chart-title-group" style={{ marginBottom: '0.5rem' }}>
        <div>
          <h2 className="chart-title">Tweets</h2>
        </div>
        <span className="kpi-meta">{pagination.total.toLocaleString()} records match</span>
      </div>

      {tweets.length > 0 ? (
        <>
          <div className="tweets-table-container">
            <table className="tweets-table">
              <thead>
                <tr>
                  <th scope="col">Tweet Content</th>
                  <th scope="col">Sentiment</th>
                  <th scope="col">Confidence</th>
                  <th scope="col">Airline</th>
                  <th scope="col">Topic</th>
                  <th scope="col">Origin</th>
                  <th scope="col">Date</th>
                </tr>
              </thead>
              <tbody>
                {tweets.map((tweet) => (
                  <tr key={tweet.fact_id}>
                    <td className="tweet-text-cell">
                      <p className="tweet-text-original">{tweet.tweet_text}</p>
                      {tweet.tweet_text_clean && (
                        <p className="tweet-text-clean">Cleaned: {tweet.tweet_text_clean}</p>
                      )}
                    </td>
                    <td>
                      <span className={`sentiment-chip sentiment-${tweet.sentiment.toLowerCase()}`}>
                        {tweet.sentiment}
                      </span>
                    </td>
                    <td>
                      <span className="confidence-badge" style={getConfidenceStyle(tweet.confidence)}>
                        {Math.round(tweet.confidence * 100)}%
                      </span>
                    </td>
                    <td className="td-airline">
                      {tweet.airline}
                    </td>
                    <td className="td-topic">
                      {tweet.topic}
                    </td>
                    <td>
                      <span className="platform-badge">
                        {tweet.platform}
                      </span>
                    </td>
                    <td className="td-date">
                      {formatDate(tweet.date)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="pagination-group">
              <div className="pagination-info" aria-live="polite">
                Page <strong>{currentPage}</strong> of{' '}
                <strong>{pagination.totalPages}</strong>
              </div>
              <div className="pagination-controls">
                <button
                  className="btn-pagination"
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={!pagination.hasPrevPage}
                  aria-label="Previous Page"
                >
                  <ChevronLeft size={16} aria-hidden="true" />
                  Prev
                </button>
                <button
                  className="btn-pagination"
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={!pagination.hasNextPage}
                  aria-label="Next Page"
                >
                  Next
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <EmptyFeedState />
      )}
    </section>
  );
};
