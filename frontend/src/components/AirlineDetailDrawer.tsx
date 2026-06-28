import React from 'react';
import { X } from 'lucide-react';
import type { AirlineSentiment, Tweet } from '../services/api';

interface AirlineDetailDrawerProps {
  airlineName: string | null;
  airlineSentiment: AirlineSentiment | null;
  recentTweets: Tweet[];
  onClose: () => void;
}

export const AirlineDetailDrawer: React.FC<AirlineDetailDrawerProps> = ({
  airlineName,
  airlineSentiment,
  recentTweets,
  onClose,
}) => {
  if (!airlineName) return null;

  // Calculate sentiment index
  const pos = airlineSentiment?.sentimentCounts.positive || 0;
  const neg = airlineSentiment?.sentimentCounts.negative || 0;
  const total = pos + neg;
  const score = total > 0 ? Math.round((pos / total) * 100) : 50;

  // Mock primary issues based on complaints counts
  const topIssues = [
    { name: 'Flight Delays', pct: 45, severity: 'High' },
    { name: 'Baggage Handling', pct: 28, severity: 'Medium' },
    { name: 'Customer Service', pct: 17, severity: 'Low' },
  ];

  // Generate dynamic AI recommendations based on airline profile
  const getAIRecommendation = (name: string) => {
    switch (name) {
      case 'United Airlines':
        return [
          {
            title: 'Luggage Processing Congestion',
            desc: 'Optimize luggage sorting lines in Terminal 1 (ORD). Spikes indicate baggage delay notifications are delayed.',
          },
          {
            title: 'Staff Scheduling Alert',
            desc: 'Deploy additional customer support team members to Newark (EWR) to absorb terminal queues due to early morning delays.',
          },
        ];
      case 'American Airlines':
        return [
          {
            title: 'Gate Connection Delays',
            desc: 'A passenger backlog is building up at gate connections in Dallas (DFW). Delay boarding for gate 14B by 10 minutes to sync transfers.',
          },
          {
            title: 'Social Media Engagement',
            desc: 'Direct customer service representatives to prioritize tweets complaining about gate changes to prevent queue frustration.',
          },
        ];
      case 'Delta Air Lines':
        return [
          {
            title: 'WiFi Connectivity Complaints',
            desc: 'System reports 15% spike in onboard WiFi complaints. Flag tails #N412D and #N825D for ground maintenance check.',
          },
        ];
      default:
        return [
          {
            title: 'Queue Mitigation Protocol',
            desc: 'Deploy floating ground personnel equipped with mobile check-in tablets to terminal queues showing over 15-minute wait times.',
          },
          {
            title: 'Automated Status Updates',
            desc: 'Trigger automated flight status SMS updates to passengers booked on late morning routes to lower inbound call volume.',
          },
        ];
    }
  };

  const aiRecs = getAIRecommendation(airlineName);

  return (
    <div className={`drawer-overlay ${airlineName ? 'open' : ''}`} onClick={onClose}>
      <aside className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="drawer-header">
          <div>
            <h2 className="drawer-title">{airlineName}</h2>
            <p className="drawer-subtitle">Fleet Operational Profile</p>
          </div>
          <button className="btn-close-drawer" onClick={onClose} aria-label="Close Profile">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="drawer-content">
          {/* Section 1: KPI Stats */}
          <div className="drawer-section">
            <h3 className="section-label">Sentiment Performance</h3>
            <div className="drawer-stats-row">
              <div className="drawer-stat-item">
                <span className="stat-num">{score}</span>
                <span className="stat-lbl">reputation index</span>
              </div>
              <div className="drawer-stat-item">
                <span className="stat-num">{total}</span>
                <span className="stat-lbl">monitored signals</span>
              </div>
            </div>
            <div className="stat-progress-bar">
              <div className="stat-progress-fill" style={{ width: `${score}%` }} />
            </div>
          </div>

          {/* Section 2: AI Recommendation Panel */}
          <div className="drawer-section ai-recs-panel">
            <h3 className="section-label" style={{ color: 'var(--color-primary)' }}>
              🤖 AI Operational Advisory
            </h3>
            <div className="ai-recs-list">
              {aiRecs.map((rec, idx) => (
                <div key={idx} className="ai-rec-card">
                  <h4 className="ai-rec-title">{rec.title}</h4>
                  <p className="ai-rec-desc">{rec.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Primary Issues */}
          <div className="drawer-section">
            <h3 className="section-label">Primary Complaints</h3>
            <div className="issues-list">
              {topIssues.map((issue, idx) => (
                <div key={idx} className="issue-row">
                  <div className="issue-details">
                    <span className="issue-name">{issue.name}</span>
                    <span className="issue-percentage">{issue.pct}% of complaints</span>
                  </div>
                  <div className="issue-bar">
                    <div 
                      className={`issue-bar-fill ${issue.severity.toLowerCase()}`} 
                      style={{ width: `${issue.pct}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Recent Signals (Tweets) */}
          <div className="drawer-section">
            <h3 className="section-label">Recent Customer Signals</h3>
            <div className="drawer-tweets-list">
              {recentTweets.length > 0 ? (
                recentTweets.map((tweet) => (
                  <div 
                    key={tweet.fact_id} 
                    className={`drawer-tweet-card ${tweet.sentiment.toLowerCase()}`}
                  >
                    <div className="dt-card-header">
                      <span className="dt-platform">{tweet.platform}</span>
                      <span className={`dt-sentiment sentiment-${tweet.sentiment.toLowerCase()}`}>
                        {tweet.sentiment}
                      </span>
                    </div>
                    <p className="dt-text">{tweet.tweet_text}</p>
                    <div className="dt-footer">
                      <span className="dt-topic">{tweet.topic}</span>
                      <span className="dt-confidence">
                        {Math.round(tweet.confidence * 100)}% confidence
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="dt-empty">No active signals found for this airline.</p>
              )}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};
