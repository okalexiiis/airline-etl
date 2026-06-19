import React from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  MessageSquare,
  Globe
} from 'lucide-react';
import type { PaginatedTweets } from '../services/api';

// Custom Twitter icon path since brand icons were removed in newer lucide versions
const TwitterIcon: React.FC<{ size?: number; style?: React.CSSProperties }> = ({ size = 14, style }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
  >
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
  </svg>
);

interface TweetsFeedProps {
  paginatedTweets: PaginatedTweets | null;
  currentPage: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
}

export const TweetsFeed: React.FC<TweetsFeedProps> = ({ 
  paginatedTweets, 
  currentPage, 
  onPageChange,
  loading = false
}) => {
  if (!paginatedTweets) return null;

  const { data: tweets, pagination } = paginatedTweets;

  // Format date helper
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

  // Color mapping helper for confidence scores
  const getConfidenceStyle = (score: number) => {
    if (score >= 0.85) return { color: '#10b981', fontWeight: 600 }; // Green
    if (score >= 0.6) return { color: '#f59e0b', fontWeight: 600 }; // Amber
    return { color: '#f43f5e', fontWeight: 600 }; // Rose
  };

  // Icon helper for platform
  const getPlatformIcon = (platform: string) => {
    const p = platform.toLowerCase();
    if (p === 'twitter' || p === 'x') {
      return <TwitterIcon size={14} style={{ color: '#1da1f2', marginRight: '4px', verticalAlign: 'middle' }} />;
    }
    if (p === 'web') {
      return <Globe size={14} style={{ color: '#a855f7', marginRight: '4px', verticalAlign: 'middle' }} />;
    }
    return <MessageSquare size={14} style={{ color: '#94a3b8', marginRight: '4px', verticalAlign: 'middle' }} />;
  };

  return (
    <section className="glass-card tweets-section" aria-label="Tweets detailed list">
      <div className="chart-title-group" style={{ marginBottom: '0.5rem' }}>
        <div>
          <h2 className="chart-title">Analytic Feed Explorer</h2>
          <p className="brand-subtitle">Browse, sort, and search individual sentiment predictions</p>
        </div>
        <span className="kpi-meta">{pagination.total.toLocaleString()} records match</span>
      </div>

      <div className="tweets-table-container" style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.25s ease-in-out' }}>
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
            {tweets.length > 0 ? (
              tweets.map((tweet) => (
                <tr key={tweet.fact_id}>
                  {/* Tweet Text */}
                  <td className="tweet-text-cell">
                    <p className="tweet-text-original">{tweet.tweet_text}</p>
                    {tweet.tweet_text_clean && (
                      <p className="tweet-text-clean">Cleaned: {tweet.tweet_text_clean}</p>
                    )}
                  </td>
                  
                  {/* Sentiment Chip */}
                  <td>
                    <span className={`sentiment-chip sentiment-${tweet.sentiment.toLowerCase()}`}>
                      {tweet.sentiment}
                    </span>
                  </td>

                  {/* Confidence */}
                  <td>
                    <span className="confidence-badge" style={getConfidenceStyle(tweet.confidence)}>
                      {Math.round(tweet.confidence * 100)}%
                    </span>
                  </td>

                  {/* Airline */}
                  <td style={{ fontWeight: 600, color: '#f8fafc' }}>
                    {tweet.airline}
                  </td>

                  {/* Topic */}
                  <td style={{ color: '#cbd5e1', fontSize: '0.8125rem' }}>
                    {tweet.topic}
                  </td>

                  {/* Platform */}
                  <td>
                    <span className="platform-badge">
                      {getPlatformIcon(tweet.platform)}
                      {tweet.platform}
                    </span>
                  </td>

                  {/* Date */}
                  <td style={{ whiteSpace: 'nowrap', color: '#94a3b8' }}>
                    {formatDate(tweet.date)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '3rem' }}>
                  <div className="empty-state">No matching records found. Try modifying your filter criteria.</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="pagination-group">
          <div className="pagination-info" aria-live="polite">
            Page <strong style={{ color: '#f8fafc' }}>{currentPage}</strong> of{' '}
            <strong style={{ color: '#f8fafc' }}>{pagination.totalPages}</strong>{' '}
            ({pagination.total.toLocaleString()} total items)
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
    </section>
  );
};
