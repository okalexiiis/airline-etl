import React from 'react';
import type { KPIData } from '../services/api';

interface KPICardsProps {
  kpis: KPIData | null;
  loading?: boolean;
}

const SkeletonCard: React.FC = () => (
  <article className="glass-card kpi-card kpi-skeleton-card skeleton-pulse" aria-hidden="true">
    <div className="kpi-header">
      <div className="kpi-skeleton-tag" />
    </div>
    <div className="kpi-value-group kpi-skeleton-value-group">
      <div className="kpi-skeleton-value" />
      <div className="kpi-skeleton-meta" />
    </div>
  </article>
);

const ZeroStateCard: React.FC<{
  title: string;
  highlighted?: boolean;
}> = ({ title, highlighted }) => (
  <article className={`glass-card kpi-card kpi-zero-card${highlighted ? ' kpi-highlight-reputation' : ''}`}>
    <div className="kpi-header">
      <h2 className="kpi-title">{title}</h2>
    </div>
    <div className="kpi-value-group kpi-zero-value-group">
      <div className="kpi-value">0</div>
    </div>
  </article>
);

export const KPICards: React.FC<KPICardsProps> = ({ kpis, loading = false }) => {
  if (loading) {
    return (
      <section className="kpi-grid-four" aria-label="Key Performance Indicators" aria-busy="true">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </section>
    );
  }

  if (!kpis) {
    return (
      <section className="kpi-grid-four" aria-label="Key Performance Indicators">
        <ZeroStateCard title="Tweet Volume" />
        <ZeroStateCard title="Negative Mentions" />
        <ZeroStateCard title="NLP Confidence" />
        <ZeroStateCard title="Reputation Score" highlighted />
      </section>
    );
  }

  const { totalTweets, avgConfidence, sentimentCounts } = kpis;

  const posCount = sentimentCounts.positive || 0;
  const negCount = sentimentCounts.negative || 0;
  const totalSentiment = posCount + negCount;
  const reputationScore = totalSentiment > 0
    ? Math.round((posCount / totalSentiment) * 100)
    : 50;

  return (
    <section className="kpi-grid-four" aria-label="Key Performance Indicators">
      <article className="glass-card kpi-card">
        <div className="kpi-header">
          <h2 className="kpi-title">Tweet Volume</h2>
        </div>
        <div className="kpi-value-group">
          <div className="kpi-value">{totalTweets.toLocaleString()}</div>
        </div>
      </article>

      <article className="glass-card kpi-card">
        <div className="kpi-header">
          <h2 className="kpi-title">Negative Mentions</h2>
        </div>
        <div className="kpi-value-group">
          <div className="kpi-value">
            {totalTweets > 0 ? Math.round((negCount / totalTweets) * 100) : 0}%
          </div>
        </div>
      </article>

      <article className="glass-card kpi-card">
        <div className="kpi-header">
          <h2 className="kpi-title">NLP Confidence</h2>
        </div>
        <div className="kpi-value-group">
          <div className="kpi-value">{Math.round(avgConfidence * 100)}%</div>
        </div>
      </article>

      <article className="glass-card kpi-card kpi-highlight-reputation">
        <div className="kpi-header">
          <h2 className="kpi-title">Reputation Score</h2>
        </div>
        <div className="kpi-value-group">
          <div className="kpi-value">{reputationScore}</div>
        </div>
      </article>
    </section>
  );
};
