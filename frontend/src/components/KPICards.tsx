import React from 'react';
import { 
  MessageSquare, 
  Target, 
  Smile, 
  Meh, 
  Frown 
} from 'lucide-react';
import type { KPIData } from '../services/api';

interface KPICardsProps {
  kpis: KPIData | null;
}

export const KPICards: React.FC<KPICardsProps> = ({ kpis }) => {
  if (!kpis) return null;

  const { totalTweets, avgConfidence, sentimentCounts, sentimentPercentages } = kpis;

  return (
    <section className="kpi-grid" aria-label="Key Performance Indicators">
      {/* Total Tweets Card */}
      <article className="glass-card kpi-card">
        <div className="kpi-header">
          <h2 className="kpi-title">Total Tweets</h2>
          <div className="kpi-icon-wrapper" aria-hidden="true">
            <MessageSquare size={20} color="#86a8e7" />
          </div>
        </div>
        <div className="kpi-value-group">
          <div className="kpi-value">{totalTweets.toLocaleString()}</div>
          <span className="kpi-meta">analyzed</span>
        </div>
      </article>

      {/* Average Model Confidence Card */}
      <article className="glass-card kpi-card">
        <div className="kpi-header">
          <h2 className="kpi-title">Model Confidence</h2>
          <div className="kpi-icon-wrapper" aria-hidden="true">
            <Target size={20} color="#a855f7" />
          </div>
        </div>
        <div className="kpi-value-group">
          <div className="kpi-value">{Math.round(avgConfidence * 100)}%</div>
          <span className="kpi-meta">average score</span>
        </div>
      </article>

      {/* Positive Sentiment Card */}
      <article className="glass-card kpi-card glow-positive">
        <div className="kpi-header">
          <h2 className="kpi-title">Positive</h2>
          <div className="kpi-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.08)' }} aria-hidden="true">
            <Smile size={20} color="#10b981" />
          </div>
        </div>
        <div className="kpi-value-group">
          <div className="kpi-value">{sentimentPercentages.positive}%</div>
          <span className="kpi-meta" style={{ color: '#10b981' }}>
            {sentimentCounts.positive.toLocaleString()} tweets
          </span>
        </div>
      </article>

      {/* Neutral Sentiment Card */}
      <article className="glass-card kpi-card glow-neutral">
        <div className="kpi-header">
          <h2 className="kpi-title">Neutral</h2>
          <div className="kpi-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.08)' }} aria-hidden="true">
            <Meh size={20} color="#f59e0b" />
          </div>
        </div>
        <div className="kpi-value-group">
          <div className="kpi-value">{sentimentPercentages.neutral}%</div>
          <span className="kpi-meta" style={{ color: '#f59e0b' }}>
            {sentimentCounts.neutral.toLocaleString()} tweets
          </span>
        </div>
      </article>

      {/* Negative Sentiment Card */}
      <article className="glass-card kpi-card glow-negative">
        <div className="kpi-header">
          <h2 className="kpi-title">Negative</h2>
          <div className="kpi-icon-wrapper" style={{ background: 'rgba(244, 63, 94, 0.08)' }} aria-hidden="true">
            <Frown size={20} color="#f43f5e" />
          </div>
        </div>
        <div className="kpi-value-group">
          <div className="kpi-value">{sentimentPercentages.negative}%</div>
          <span className="kpi-meta" style={{ color: '#f43f5e' }}>
            {sentimentCounts.negative.toLocaleString()} tweets
          </span>
        </div>
      </article>
    </section>
  );
};
