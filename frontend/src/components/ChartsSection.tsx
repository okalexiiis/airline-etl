import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import type { TrendDataPoint, AirlineSentiment, TopicSentiment } from '../services/api';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ChartsSectionProps {
  trends: TrendDataPoint[];
  airlines: AirlineSentiment[];
  topics: TopicSentiment[];
}

export const ChartsSection: React.FC<ChartsSectionProps> = ({ trends, airlines, topics }) => {
  // Chart Global Settings for Dark Mode
  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#e2e8f0', // slate-200
          font: {
            family: "'Inter', sans-serif",
            size: 11,
            weight: 500 as any,
          },
          padding: 15,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 17, 34, 0.95)',
        titleColor: '#ffffff',
        bodyColor: '#e2e8f0',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        font: {
          family: "'Inter', sans-serif",
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.04)',
        },
        ticks: {
          color: '#94a3b8', // slate-400
          font: {
            family: "'Inter', sans-serif",
            size: 10,
          },
        },
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.04)',
        },
        ticks: {
          color: '#94a3b8',
          font: {
            family: "'Inter', sans-serif",
            size: 10,
          },
        },
      },
    },
  };

  /* -------------------------------------------------------------
     1. TRENDS CHART (Line / Area)
     ------------------------------------------------------------- */
  const trendsChartData = {
    labels: trends.map((t) => {
      // Format YYYY-MM-DD to a more readable date (e.g. Feb 22)
      try {
        const parts = t.date.split('-');
        const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
      } catch {
        return t.date;
      }
    }),
    datasets: [
      {
        fill: true,
        label: 'Positive',
        data: trends.map((t) => t.positive),
        borderColor: '#10b981', // emerald-500
        backgroundColor: 'rgba(16, 185, 129, 0.05)',
        tension: 0.35,
        borderWidth: 2,
        pointBackgroundColor: '#10b981',
        pointRadius: 2,
        pointHoverRadius: 5,
      },
      {
        fill: true,
        label: 'Neutral',
        data: trends.map((t) => t.neutral),
        borderColor: '#f59e0b', // amber-500
        backgroundColor: 'rgba(245, 158, 11, 0.05)',
        tension: 0.35,
        borderWidth: 2,
        pointBackgroundColor: '#f59e0b',
        pointRadius: 2,
        pointHoverRadius: 5,
      },
      {
        fill: true,
        label: 'Negative',
        data: trends.map((t) => t.negative),
        borderColor: '#f43f5e', // rose-500
        backgroundColor: 'rgba(244, 63, 94, 0.05)',
        tension: 0.35,
        borderWidth: 2,
        pointBackgroundColor: '#f43f5e',
        pointRadius: 2,
        pointHoverRadius: 5,
      },
    ],
  };

  const trendsOptions = {
    ...commonOptions,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
  };

  /* -------------------------------------------------------------
     2. AIRLINE COMPARISON CHART (Stacked Bar)
     ------------------------------------------------------------- */
  const airlinesChartData = {
    labels: airlines.map((a) => a.airlineName),
    datasets: [
      {
        label: 'Positive (%)',
        data: airlines.map((a) => a.sentimentPercentages.positive),
        backgroundColor: '#10b981',
        borderRadius: { topLeft: 0, topRight: 0, bottomLeft: 4, bottomRight: 4 },
      },
      {
        label: 'Neutral (%)',
        data: airlines.map((a) => a.sentimentPercentages.neutral),
        backgroundColor: '#f59e0b',
        borderRadius: 0,
      },
      {
        label: 'Negative (%)',
        data: airlines.map((a) => a.sentimentPercentages.negative),
        backgroundColor: '#f43f5e',
        borderRadius: { topLeft: 4, topRight: 4, bottomLeft: 0, bottomRight: 0 },
      },
    ],
  };

  const airlinesOptions = {
    ...commonOptions,
    scales: {
      x: {
        ...commonOptions.scales.x,
        stacked: true,
      },
      y: {
        ...commonOptions.scales.y,
        stacked: true,
        max: 100,
        ticks: {
          ...commonOptions.scales.y.ticks,
          callback: (value: any) => `${value}%`,
        },
      },
    },
  };

  /* -------------------------------------------------------------
     3. TOP TOPICS / COMPLAINTS CHART (Horizontal Bar)
     ------------------------------------------------------------- */
  // Filter out "Not Specified" topic if desired, or show it. Let's filter out "Not Specified" 
  // from the complaints analysis if we want to focus on active categories, or keep it.
  // We'll show top 7 topics sorted by count
  const sortedTopics = [...topics]
    .filter(t => t.topicName !== 'Not Specified')
    .slice(0, 8);

  const topicsChartData = {
    labels: sortedTopics.map((t) => t.topicName),
    datasets: [
      {
        label: 'Negative Tweets',
        data: sortedTopics.map((t) => t.sentimentCounts.negative),
        backgroundColor: 'rgba(244, 63, 94, 0.8)',
        borderColor: '#f43f5e',
        borderWidth: 1.5,
        borderRadius: 6,
        barThickness: 16,
      },
      {
        label: 'Neutral Tweets',
        data: sortedTopics.map((t) => t.sentimentCounts.neutral),
        backgroundColor: 'rgba(245, 158, 11, 0.7)',
        borderColor: '#f59e0b',
        borderWidth: 1.5,
        borderRadius: 6,
        barThickness: 16,
      },
      {
        label: 'Positive Tweets',
        data: sortedTopics.map((t) => t.sentimentCounts.positive),
        backgroundColor: 'rgba(16, 185, 129, 0.7)',
        borderColor: '#10b981',
        borderWidth: 1.5,
        borderRadius: 6,
        barThickness: 16,
      }
    ],
  };

  const topicsOptions = {
    ...commonOptions,
    indexAxis: 'y' as const,
    scales: {
      x: {
        ...commonOptions.scales.x,
        stacked: true,
      },
      y: {
        ...commonOptions.scales.y,
        stacked: true,
        ticks: {
          color: '#e2e8f0',
          font: {
            family: "'Inter', sans-serif",
            size: 11,
            weight: 500 as any,
          },
        },
      },
    },
  };

  return (
    <section className="charts-grid" aria-label="Visual Analytics Charts">
      {/* 1. Timeline Chart */}
      <div className="glass-card chart-full-width">
        <div className="chart-title-group">
          <h2 className="chart-title">Sentiment Volume Timeline</h2>
          <span className="kpi-meta">Daily Sentiment distribution</span>
        </div>
        <div className="chart-canvas-container">
          {trends.length > 0 ? (
            <Line data={trendsChartData} options={trendsOptions} />
          ) : (
            <div className="empty-state">No trend data available for the active filters.</div>
          )}
        </div>
      </div>

      {/* 2. Airline Sentiment Comparison Bar Chart */}
      <div className="glass-card chart-half-width">
        <div className="chart-title-group">
          <h2 className="chart-title">Airlines Sentiment Share</h2>
          <span className="kpi-meta">Comparative sentiment percentages</span>
        </div>
        <div className="chart-canvas-container">
          {airlines.length > 0 ? (
            <Bar data={airlinesChartData} options={airlinesOptions} />
          ) : (
            <div className="empty-state">No airline comparison data available.</div>
          )}
        </div>
      </div>

      {/* 3. Top Topic Complaints Chart */}
      <div className="glass-card chart-half-width">
        <div className="chart-title-group">
          <h2 className="chart-title">Topic Classification Breakdown</h2>
          <span className="kpi-meta">Categorized passenger feedback reasons</span>
        </div>
        <div className="chart-canvas-container">
          {sortedTopics.length > 0 ? (
            <Bar data={topicsChartData} options={topicsOptions} />
          ) : (
            <div className="empty-state">No topic data available.</div>
          )}
        </div>
      </div>
    </section>
  );
};
