import React, { useMemo } from 'react';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarController,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import type { TrendDataPoint, TopicSentiment, AirlineSentiment, KPIData } from '../services/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarController,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface DashboardChartsProps {
  trends: TrendDataPoint[];
  topics: TopicSentiment[];
  airlines: AirlineSentiment[];
  kpis: KPIData | null;
  loading?: boolean;
}

const POS = '#557257';
const NEU = '#ca8b3b';
const NEG = '#b5473f';

// Compact number formatter: 1200 -> "1.2k", 1200000 -> "1.2M"
function fmt(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

const SHARED_TOOLTIP: any = {
  backgroundColor: 'var(--color-bg-surface)',
  titleColor: 'var(--color-text-primary)',
  bodyColor: 'var(--color-text-secondary)',
  borderColor: 'var(--color-border)',
  borderWidth: 1,
  padding: 10,
  cornerRadius: 6,
  boxPadding: 4,
  displayColors: true,
  usePointStyle: true,
  titleFont: { family: 'var(--font-heading)', size: 11, weight: 'bold' as const },
  bodyFont: { family: 'var(--font-body)', size: 11 },
};

// Scriptable background color: builds a vertical gradient on the chart canvas
// from a solid color (top) to transparent (bottom). Used for line chart fills.
function gradientFill(hex: string) {
  return (ctx: any) => {
    const chart = ctx.chart;
    const { ctx: c, chartArea } = chart;
    if (!chartArea) return hex + '20'; // approximate 12% alpha before layout
    const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    g.addColorStop(0, hex + '22');
    g.addColorStop(1, hex + '00');
    return g;
  };
}

function buildStackedBarData(labels: string[], pos: number[], neu: number[], neg: number[]) {
  if (labels.length === 0) return null;
  return {
    labels,
    datasets: [
      { label: 'Positive', data: pos, backgroundColor: POS, borderRadius: 4, borderSkipped: false },
      { label: 'Neutral', data: neu, backgroundColor: NEU, borderRadius: 4, borderSkipped: false },
      { label: 'Negative', data: neg, backgroundColor: NEG, borderRadius: 4, borderSkipped: false },
    ],
  };
}

const sharedLegend = {
  position: 'top' as const,
  labels: {
    color: 'var(--color-text-secondary)',
    font: { family: 'var(--font-body)', size: 10, weight: 'bold' as const },
    boxWidth: 10,
    boxHeight: 10,
    padding: 12,
    usePointStyle: true,
    pointStyle: 'circle' as const,
  },
};

const stackedBarOptions: any = {
  indexAxis: 'y' as const,
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 600, easing: 'easeOutQuart' as const },
  interaction: { mode: 'nearest' as const, intersect: false },
  plugins: {
    legend: sharedLegend,
    tooltip: { ...SHARED_TOOLTIP, callbacks: { label: (c: any) => `${c.dataset.label}: ${fmt(c.parsed.x)}` } },
  },
  scales: {
    x: {
      stacked: true,
      grid: { color: 'rgba(0, 0, 0, 0.04)', drawTicks: false },
      border: { display: false },
      ticks: {
        color: 'var(--color-text-muted)',
        font: { size: 9 },
        callback: (v: number) => fmt(v),
      },
    },
    y: {
      stacked: true,
      grid: { display: false },
      border: { display: false },
      ticks: { color: 'var(--color-text-secondary)', font: { size: 10, family: 'var(--font-body)' }, padding: 8 },
    },
  },
};

const skeleton = <div className="chart-skeleton skeleton-pulse" />;

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
  trends, topics, airlines, kpis, loading = false,
}) => {
  const hasTrends = trends.length > 0;
  const hasTopics = topics.length > 0;
  const hasAirlines = airlines.length > 0;
  const hasKpis = kpis !== null;

  // ----- Line: Sentiment Trends -----
  const lineData = useMemo(() => {
    if (!hasTrends) return null;
    const maxVal = Math.max(...trends.flatMap((t) => [t.positive, t.neutral, t.negative]));
    return {
      labels: trends.map((t) => {
        const parts = t.date.split('-');
        return parts.length >= 3 ? `${parts[1]}/${parts[2]}` : t.date;
      }),
      datasets: [
        {
          label: 'Positive',
          data: trends.map((t) => t.positive),
          borderColor: POS,
          backgroundColor: gradientFill(POS),
          borderWidth: 2,
          tension: 0.4,
          fill: true,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointBackgroundColor: POS,
          pointBorderColor: '#fffefa',
          pointBorderWidth: 2,
        },
        {
          label: 'Neutral',
          data: trends.map((t) => t.neutral),
          borderColor: NEU,
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointBackgroundColor: NEU,
          pointBorderColor: '#fffefa',
          pointBorderWidth: 2,
        },
        {
          label: 'Negative',
          data: trends.map((t) => t.negative),
          borderColor: NEG,
          backgroundColor: gradientFill(NEG),
          borderWidth: 2,
          tension: 0.4,
          fill: true,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointBackgroundColor: NEG,
          pointBorderColor: '#fffefa',
          pointBorderWidth: 2,
        },
      ],
      // pass-through for suggestedMax used by options below
      _max: maxVal,
    };
  }, [trends, hasTrends]);

  const lineOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 600, easing: 'easeOutQuart' as const },
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: sharedLegend,
      tooltip: { ...SHARED_TOOLTIP, callbacks: { label: (c: any) => `${c.dataset.label}: ${fmt(c.parsed.y)}` } },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: 'var(--color-text-muted)', font: { size: 9, family: 'var(--font-body)' } },
      },
      y: {
        grid: { color: 'rgba(0, 0, 0, 0.05)', drawTicks: false },
        border: { display: false },
        suggestedMax: lineData ? Math.ceil((lineData as any)._max * 1.1) : undefined,
        ticks: {
          color: 'var(--color-text-muted)',
          font: { size: 9 },
          padding: 8,
          callback: (v: number) => fmt(v),
        },
      },
    },
  }), [lineData]);

  // ----- Donut: Sentiment Distribution -----
  const donutData = useMemo(() => {
    if (!hasKpis) return null;
    const { sentimentCounts } = kpis;
    const pos = sentimentCounts.positive || 0;
    const neu = sentimentCounts.neutral || 0;
    const neg = sentimentCounts.negative || 0;
    const total = pos + neu + neg;
    if (total === 0) return null;
    return {
      labels: ['Positive', 'Neutral', 'Negative'],
      datasets: [{
        data: [pos, neu, neg],
        backgroundColor: [POS, NEU, NEG],
        borderWidth: 2,
        borderColor: 'var(--color-bg-surface)',
      }],
    };
  }, [kpis, hasKpis]);

  const donutTotal = hasKpis
    ? (kpis.sentimentCounts.positive || 0) + (kpis.sentimentCounts.neutral || 0) + (kpis.sentimentCounts.negative || 0)
    : 0;
  const donutPosPct = donutTotal > 0
    ? Math.round(((kpis?.sentimentCounts.positive || 0) / donutTotal) * 100)
    : 0;

  const centerTextPlugin = useMemo(() => ({
    id: 'centerText',
    afterDraw(chart: any) {
      const { ctx, width, height } = chart;
      if (!width || !height) return;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const root = getComputedStyle(document.documentElement);
      ctx.fillStyle = root.getPropertyValue('--color-text-primary').trim();
      ctx.font = `800 1.5rem ${root.getPropertyValue('--font-heading').trim()}`;
      ctx.fillText(donutTotal.toLocaleString(), width / 2, height / 2 - 10);
      ctx.fillStyle = POS;
      ctx.font = `600 0.72rem ${root.getPropertyValue('--font-body').trim()}`;
      ctx.fillText(`${donutPosPct}% positive`, width / 2, height / 2 + 12);
      ctx.restore();
    },
  }), [donutTotal, donutPosPct]);

  const donutOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 600, easing: 'easeOutQuart' as const },
    cutout: '72%',
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: 'var(--color-text-secondary)',
          font: { family: 'var(--font-body)', size: 10 },
          boxWidth: 10,
          boxHeight: 10,
          padding: 10,
          usePointStyle: true,
          pointStyle: 'circle' as const,
        },
      },
      tooltip: {
        ...SHARED_TOOLTIP,
        callbacks: {
          label: (c: any) => {
            const total = c.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const pct = total > 0 ? Math.round((c.parsed / total) * 100) : 0;
            return `${c.label}: ${fmt(c.parsed)} (${pct}%)`;
          },
        },
      },
    },
  }), []);

  // ----- Bar: Topic Sentiment -----
  const topicBarData = useMemo(() => {
    if (!hasTopics) return null;
    const labels = topics.map((t) => t.topicName);
    const pos = topics.map((t) => t.sentimentCounts.positive || 0);
    const neu = topics.map((t) => t.sentimentCounts.neutral || 0);
    const neg = topics.map((t) => t.sentimentCounts.negative || 0);
    return buildStackedBarData(labels, pos, neu, neg);
  }, [topics, hasTopics]);

  // ----- Bar: Airline Comparison -----
  const airlineBarData = useMemo(() => {
    if (!hasAirlines) return null;
    const sorted = [...airlines].sort((a, b) => {
      const aNeg = (a.sentimentCounts.negative || 0) / (a.totalTweets || 1);
      const bNeg = (b.sentimentCounts.negative || 0) / (b.totalTweets || 1);
      return bNeg - aNeg;
    });
    const labels = sorted.map((a) => a.airlineName);
    const pos = sorted.map((a) => a.sentimentCounts.positive || 0);
    const neu = sorted.map((a) => a.sentimentCounts.neutral || 0);
    const neg = sorted.map((a) => a.sentimentCounts.negative || 0);
    return buildStackedBarData(labels, pos, neu, neg);
  }, [airlines, hasAirlines]);

  const empty = (title: string) => (
    <div className="chart-empty-state">
      <h4 className="chart-empty-title">{title}</h4>
      <p className="chart-empty-subtitle">Generate a dataset or adjust your filters</p>
    </div>
  );

  const chartCard = (title: string, chart: React.ReactNode, canvasClass: string, isEmpty: boolean, emptyTitle: string) => (
    <article className={`glass-card ${canvasClass === 'line-canvas' ? 'chart-trend-card' : canvasClass === 'pie-canvas' ? 'chart-pie-card' : 'chart-bar-card'}`}>
      <div className="chart-header">
        <h3 className="chart-card-title">{title}</h3>
      </div>
      <div className={`chart-canvas-container ${canvasClass}`}>
        {loading ? skeleton : isEmpty ? empty(emptyTitle) : chart}
      </div>
    </article>
  );

  return (
    <>
      <section className="charts-layout-row" aria-label="Sentiment overview">
        {chartCard('Sentiment Trends',
          lineData ? <Line data={lineData} options={lineOptions} plugins={[]} /> : null,
          'line-canvas', !hasTrends, 'No trend data yet')}
        {chartCard('Sentiment Distribution',
          donutData ? <Doughnut data={donutData} options={donutOptions} plugins={[centerTextPlugin]} /> : null,
          'pie-canvas', !donutData, 'No distribution data yet')}
      </section>

      <section className="charts-row-2" aria-label="Topic and airline breakdowns">
        {chartCard('Topics',
          topicBarData ? <Bar data={topicBarData} options={stackedBarOptions} /> : null,
          'bar-canvas', !hasTopics, 'No topic data yet')}
        {chartCard('Airlines',
          airlineBarData ? <Bar data={airlineBarData} options={stackedBarOptions} /> : null,
          'bar-canvas', !hasAirlines, 'No airline data yet')}
      </section>
    </>
  );
};