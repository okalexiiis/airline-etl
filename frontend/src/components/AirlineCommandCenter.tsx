import React from 'react';
import { Radar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from 'chart.js';
import type { KPIData, TrendDataPoint, AirlineSentiment, TopicSentiment } from '../services/api';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
);

interface AirlineCommandCenterProps {
  kpis: KPIData | null;
  trends: TrendDataPoint[];
  airlines: AirlineSentiment[];
  topics: TopicSentiment[];
  onSelectAirline: (airlineName: string) => void;
}

export const AirlineCommandCenter: React.FC<AirlineCommandCenterProps> = ({
  kpis,
  trends,
  airlines,
  topics,
  onSelectAirline,
}) => {
  if (!kpis) return null;

  const { sentimentCounts } = kpis;

  // Calculate Reputation Score (0 - 100)
  const posCount = sentimentCounts.positive || 0;
  const negCount = sentimentCounts.negative || 0;
  const totalSentiment = posCount + negCount;
  const reputationScore = totalSentiment > 0 
    ? Math.round((posCount / totalSentiment) * 100) 
    : 50;

  // Define Reputation Status Label
  let reputationLabel = 'Neutral';
  let reputationColor = 'var(--color-neutral)';
  if (reputationScore >= 70) {
    reputationLabel = 'Excellent';
    reputationColor = 'var(--color-positive)';
  } else if (reputationScore <= 40) {
    reputationLabel = 'Critical';
    reputationColor = 'var(--color-negative)';
  }

  // 1. Radar Chart (Emerging Topics)
  const radarLabels = topics.map((t) => t.topicName);
  const radarPositiveData = topics.map((t) => t.sentimentCounts.positive);
  const radarNegativeData = topics.map((t) => t.sentimentCounts.negative);

  const radarData = {
    labels: radarLabels.length > 0 ? radarLabels : ['Delays', 'Baggage', 'Cancellations', 'Service'],
    datasets: [
      {
        label: 'Positive Signals',
        data: radarPositiveData.length > 0 ? radarPositiveData : [12, 19, 3, 5],
        backgroundColor: 'rgba(85, 114, 87, 0.2)',
        borderColor: 'var(--color-positive)',
        borderWidth: 1.5,
        pointBackgroundColor: 'var(--color-positive)',
      },
      {
        label: 'Negative Signals',
        data: radarNegativeData.length > 0 ? radarNegativeData : [24, 9, 35, 18],
        backgroundColor: 'rgba(181, 71, 63, 0.2)',
        borderColor: 'var(--color-negative)',
        borderWidth: 1.5,
        pointBackgroundColor: 'var(--color-negative)',
      },
    ],
  };

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: 'var(--color-text-secondary)',
          font: { family: 'var(--font-body)', size: 10 },
        },
      },
    },
    scales: {
      r: {
        grid: { color: 'var(--color-border)' },
        angleLines: { color: 'var(--color-border)' },
        pointLabels: {
          color: 'var(--color-text-secondary)',
          font: { family: 'var(--font-heading)', size: 9, weight: 'bold' as const },
        },
        ticks: {
          backdropColor: 'transparent',
          color: 'var(--color-text-muted)',
          font: { size: 8 },
        },
      },
    },
  };

  // 2. Timeline Chart (Hourly Sentiment Trend)
  const timelineLabels = trends.map((t) => {
    // Show last 2 digits of date/time
    return t.date.split('-').slice(1).join('/');
  });

  const timelineData = {
    labels: timelineLabels,
    datasets: [
      {
        label: 'Negative Volume',
        data: trends.map((t) => t.negative),
        borderColor: 'var(--color-negative)',
        backgroundColor: 'transparent',
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 1,
      },
      {
        label: 'Positive Volume',
        data: trends.map((t) => t.positive),
        borderColor: 'var(--color-positive)',
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        tension: 0.3,
        pointRadius: 1,
      },
    ],
  };

  const timelineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: 'var(--color-text-muted)',
          font: { size: 9, family: 'var(--font-body)' },
        },
      },
      y: {
        grid: { color: 'var(--color-border)' },
        ticks: {
          color: 'var(--color-text-muted)',
          font: { size: 9 },
        },
      },
    },
  };

  // 3. Spikes and Alerts detection
  const alerts: string[] = [];
  airlines.forEach((air) => {
    const total = air.totalTweets;
    const neg = air.sentimentCounts.negative;
    if (total > 15 && neg / total > 0.45) {
      alerts.push(`Alert: Negative sentiment spike detected on ${air.airlineName} (${Math.round((neg / total) * 100)}% negative)`);
    }
  });

  // Default fallback alert if empty
  if (alerts.length === 0) {
    alerts.push('No severe anomalies detected in the last hour.');
    alerts.push('System normal. Monitoring active flight routes.');
  }

  // Reputation Dial SVG needle angle
  // 0 rating = -90deg, 100 rating = 90deg
  const needleAngle = -90 + (reputationScore / 100) * 180;

  return (
    <div className="command-grid">
      {/* Panel 1: Route Sentiment Map (Large Spanning) */}
      <article className="glass-card panel-map">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">Active Fleet Route Monitoring</h3>
            <p className="panel-subtitle">Real-time sentiment aggregated by flight hubs</p>
          </div>
          <span className="live-pill">LIVE FEED</span>
        </div>

        <div className="map-wrapper">
          <svg viewBox="0 0 800 350" className="route-map-svg" aria-label="Route Sentiment Map">
            {/* Stylized background lines (grid) */}
            <line x1="50" y1="175" x2="750" y2="175" stroke="var(--color-border)" strokeDasharray="5,5" />
            <line x1="400" y1="20" x2="400" y2="330" stroke="var(--color-border)" strokeDasharray="5,5" />

            {/* Flight Path connections (styled SVG arcs) */}
            {/* JFK - LHR */}
            <path d="M 180,110 Q 390,40 600,110" className="flight-route route-active-pos" />
            {/* LAX - JFK */}
            <path d="M 80,180 Q 130,130 180,110" className="flight-route route-active-neu" />
            {/* MIA - LHR */}
            <path d="M 160,250 Q 380,180 600,110" className="flight-route route-active-neg" />
            {/* ORD - CDG */}
            <path d="M 130,120 Q 400,60 670,120" className="flight-route route-active-neu" />
            {/* LHR - CDG */}
            <path d="M 600,110 Q 635,115 670,120" className="flight-route route-active-pos" strokeWidth="2" />

            {/* Hubs (Airports) */}
            {/* LAX */}
            <g transform="translate(80, 180)">
              <circle r="14" className="airport-glow glow-neu" />
              <circle r="7" className="airport-node node-neu" />
              <text y="24" className="airport-label">LAX</text>
            </g>
            {/* JFK */}
            <g transform="translate(180, 110)">
              <circle r="14" className="airport-glow glow-pos" />
              <circle r="7" className="airport-node node-pos" />
              <text y="-14" className="airport-label">JFK</text>
            </g>
            {/* MIA */}
            <g transform="translate(160, 250)">
              <circle r="14" className="airport-glow glow-neg" />
              <circle r="7" className="airport-node node-neg" />
              <text y="24" className="airport-label">MIA</text>
            </g>
            {/* ORD */}
            <g transform="translate(130, 120)">
              <circle r="14" className="airport-glow glow-neu" />
              <circle r="7" className="airport-node node-neu" />
              <text x="-32" y="4" className="airport-label">ORD</text>
            </g>
            {/* LHR */}
            <g transform="translate(600, 110)">
              <circle r="14" className="airport-glow glow-pos" />
              <circle r="7" className="airport-node node-pos" />
              <text y="-14" className="airport-label">LHR</text>
            </g>
            {/* CDG */}
            <g transform="translate(670, 120)">
              <circle r="14" className="airport-glow glow-neu" />
              <circle r="7" className="airport-node node-neu" />
              <text y="24" className="airport-label">CDG</text>
            </g>
          </svg>
        </div>
      </article>

      {/* Panel 2: Reputation Gauge */}
      <article className="glass-card panel-gauge">
        <div className="panel-header">
          <h3 className="panel-title">Reputation Score</h3>
          <span className="kpi-flat-tag">INDEX</span>
        </div>
        <div className="gauge-container">
          <svg viewBox="0 0 200 120" className="gauge-svg">
            {/* Background Dial Arc */}
            <path d="M 20,100 A 80,80 0 0,1 180,100" fill="none" stroke="var(--color-border)" strokeWidth="12" strokeLinecap="round" />
            {/* Active Sentiment Arc segments (simulated green/yellow/red gradient) */}
            <path d="M 20,100 A 80,80 0 0,1 70,45" fill="none" stroke="var(--color-negative)" strokeWidth="12" />
            <path d="M 70,45 A 80,80 0 0,1 130,45" fill="none" stroke="var(--color-neutral)" strokeWidth="12" />
            <path d="M 130,45 A 80,80 0 0,1 180,100" fill="none" stroke="var(--color-positive)" strokeWidth="12" strokeLinecap="round" />
            
            {/* Needle indicator */}
            <g transform="translate(100, 100)">
              <line x1="0" y1="0" x2="0" y2="-75" stroke="#2d2621" strokeWidth="3.5" strokeLinecap="round" transform={`rotate(${needleAngle})`} />
              <circle cx="0" cy="0" r="8" fill="#2d2621" />
            </g>
          </svg>
          <div className="gauge-value-group">
            <span className="gauge-value">{reputationScore}</span>
            <span className="gauge-status" style={{ color: reputationColor }}>{reputationLabel}</span>
          </div>
        </div>
      </article>

      {/* Panel 3: Radar Chart (Topics) */}
      <article className="glass-card panel-radar">
        <div className="panel-header">
          <h3 className="panel-title">Evolving Complaint Radar</h3>
          <span className="kpi-flat-tag">AI TOPICS</span>
        </div>
        <div className="radar-chart-wrapper">
          <Radar data={radarData} options={radarOptions} />
        </div>
      </article>

      {/* Panel 4: Spike & Critical Alerts */}
      <article className="glass-card panel-alerts">
        <div className="panel-header">
          <h3 className="panel-title">Critical Spike Warnings</h3>
          <span className="kpi-flat-tag tag-negative">ALERT</span>
        </div>
        <div className="alerts-list">
          {alerts.map((alert, idx) => (
            <div key={idx} className="alert-item">
              <span className="alert-bullet" />
              <p className="alert-text">{alert}</p>
            </div>
          ))}
        </div>
      </article>

      {/* Panel 5: Dynamic Leaderboard */}
      <article className="glass-card panel-ranking">
        <div className="panel-header">
          <h3 className="panel-title">Fleet Sentiment Leaderboard</h3>
          <span className="kpi-flat-tag">RANKING</span>
        </div>
        <div className="ranking-list">
          {airlines.map((air, idx) => {
            const pos = air.sentimentCounts.positive;
            const neg = air.sentimentCounts.negative;
            const score = pos + neg > 0 ? Math.round((pos / (pos + neg)) * 100) : 50;
            return (
              <div 
                key={air.airlineId} 
                className="ranking-row" 
                onClick={() => onSelectAirline(air.airlineName)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onSelectAirline(air.airlineName);
                  }
                }}
              >
                <div className="rank-position">{idx + 1}</div>
                <div className="rank-name-group">
                  <div className="rank-name">{air.airlineName}</div>
                  <div className="rank-volume">{air.totalTweets} signals</div>
                </div>
                <div className="rank-bar-wrapper">
                  <div className="rank-bar-fill" style={{ width: `${score}%` }} />
                </div>
                <div className="rank-score">{score} idx</div>
              </div>
            );
          })}
        </div>
      </article>

      {/* Panel 6: Hourly Timeline */}
      <article className="glass-card panel-timeline">
        <div className="panel-header">
          <h3 className="panel-title">Ingestion Volume Trends</h3>
          <span className="kpi-flat-tag">TIMELINE</span>
        </div>
        <div className="timeline-chart-wrapper">
          <Line data={timelineData} options={timelineOptions} />
        </div>
      </article>

      {/* Panel 7: Word Cloud (Typographic cloud) */}
      <article className="glass-card panel-cloud">
        <div className="panel-header">
          <h3 className="panel-title">Trending Complaint Terms</h3>
          <span className="kpi-flat-tag">TERMS</span>
        </div>
        <div className="cloud-words">
          <span className="word-sz-5 word-neg">delayed</span>
          <span className="word-sz-4 word-neg">cancellation</span>
          <span className="word-sz-4 word-neu">baggage</span>
          <span className="word-sz-3 word-neg">lost</span>
          <span className="word-sz-3 word-pos">service</span>
          <span className="word-sz-2 word-pos">thanks</span>
          <span className="word-sz-2 word-neu">airport</span>
          <span className="word-sz-2 word-neg">refund</span>
          <span className="word-sz-1 word-neu">flight</span>
          <span className="word-sz-1 word-pos">good</span>
        </div>
      </article>
    </div>
  );
};
