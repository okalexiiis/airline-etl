import React, { useState } from 'react';
import { AlertTriangle, AlertCircle, CheckCircle, Search, X, ShieldCheck } from 'lucide-react';
import type { AirlineSentiment } from '../services/api';

interface AlertsPanelProps {
  airlinesSentiment: AirlineSentiment[];
  onSelectAirline: (airlineId: string | undefined) => void;
  activeAirlineId: string | undefined;
  loading?: boolean;
}

interface OperationalAlert {
  id: string;
  airlineId: number;
  airlineName: string;
  severity: 'critical' | 'warning' | 'normal';
  message: string;
  ratio: number;
  total: number;
}

const SkeletonAlertRow: React.FC = () => (
  <div className="alert-skeleton-row skeleton-pulse" aria-hidden="true">
    <div className="alert-skeleton-icon" />
    <div className="alert-skeleton-content">
      <div className="alert-skeleton-line title" />
      <div className="alert-skeleton-line message" />
      <div className="alert-skeleton-line meta" />
    </div>
  </div>
);

const NoDataState: React.FC = () => (
  <div className="alerts-no-data-state">
    <ShieldCheck size={32} className="state-icon" aria-hidden="true" />
    <h3 className="state-title">No airlines with data yet</h3>
    <p className="state-subtitle">Generate a dataset to populate alerts.</p>
  </div>
);

export const AlertsPanel: React.FC<AlertsPanelProps> = ({
  airlinesSentiment,
  onSelectAirline,
  activeAirlineId,
  loading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<'all' | 'critical' | 'warning' | 'normal'>('all');
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);

  const alerts: OperationalAlert[] = [];

  airlinesSentiment.forEach((airline) => {
    const pos = airline.sentimentCounts.positive || 0;
    const neu = airline.sentimentCounts.neutral || 0;
    const neg = airline.sentimentCounts.negative || 0;
    const total = pos + neu + neg;
    
    if (total === 0) return;

    const negRatio = neg / total;
    const negPercent = Math.round(negRatio * 100);

    let severity: 'critical' | 'warning' | 'normal' = 'normal';
    let message = '';

    if (negRatio >= 0.40 && total > 5) {
      severity = 'critical';
      message = `${negPercent}% negative — needs attention`;
    } else if (negRatio >= 0.25 && total > 5) {
      severity = 'warning';
      message = `${negPercent}% negative — monitor closely`;
    } else {
      severity = 'normal';
      message = `${negPercent}% negative — stable`;
    }

    alerts.push({
      id: `alert-${airline.airlineId}`,
      airlineId: airline.airlineId,
      airlineName: airline.airlineName,
      severity,
      message,
      ratio: negPercent,
      total,
    });
  });

  const filteredAlerts = alerts
    .filter((alert) => !dismissedAlerts.includes(alert.id))
    .filter((alert) => {
      const matchesSearch = alert.airlineName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSeverity = filterSeverity === 'all' || alert.severity === filterSeverity;
      return matchesSearch && matchesSeverity;
    });

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedAlerts([...dismissedAlerts, id]);
  };

  const handleSelectAirlineAlert = (airlineId: number) => {
    const stringId = String(airlineId);
    if (activeAirlineId === stringId) {
      onSelectAirline(undefined);
    } else {
      onSelectAirline(stringId);
    }
  };

  return (
    <article className="glass-card alerts-large-panel">
      <div className="alerts-panel-header">
        <div>
          <h2 className="alerts-panel-title">Operational Warning & Sentiment Alerts</h2>
          <p className="alerts-panel-subtitle">
            Real-time anomalies scanned from incoming airline mentions
          </p>
        </div>
        
        <div className="alerts-pill-row">
          <span className="alert-count-pill critical">
            {alerts.filter(a => a.severity === 'critical').length}
          </span>
          <span className="alert-count-pill warning">
            {alerts.filter(a => a.severity === 'warning').length}
          </span>
        </div>
      </div>

      <div className="alerts-controls">
        <div className="alerts-search-box">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            placeholder="Search alerts by airline..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="alerts-search-input"
            aria-label="Search alerts"
          />
          {searchQuery && (
            <button 
              className="btn-clear-search" 
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <div className="severity-filter-group" role="group" aria-label="Filter alerts by severity">
          {(['all', 'critical', 'warning', 'normal'] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`btn-severity-filter ${filterSeverity === sev ? 'active' : ''} ${sev}`}
            >
              {sev.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="alerts-panel-list">
        {loading ? (
          <>
            <SkeletonAlertRow />
            <SkeletonAlertRow />
            <SkeletonAlertRow />
          </>
        ) : alerts.length === 0 ? (
          <NoDataState />
        ) : filteredAlerts.length > 0 ? (
          filteredAlerts.map((alert) => {
            const isSelected = activeAirlineId === String(alert.airlineId);
            return (
              <div
                key={alert.id}
                onClick={() => handleSelectAirlineAlert(alert.airlineId)}
                className={`alert-card-row ${alert.severity} ${isSelected ? 'selected' : ''}`}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleSelectAirlineAlert(alert.airlineId);
                  }
                }}
              >
                <div className={`alert-badge-icon ${alert.severity}`} aria-hidden="true">
                  {alert.severity === 'critical' && <AlertTriangle size={15} />}
                  {alert.severity === 'warning' && <AlertCircle size={15} />}
                  {alert.severity === 'normal' && <CheckCircle size={15} />}
                </div>

                <div className="alert-card-details">
                  <div className="alert-card-header">
                    <span className="alert-airline-name">{alert.airlineName}</span>
                  </div>
                  <p className="alert-card-message">{alert.message}</p>
                  <div className="alert-card-meta">
                    <span>Sentiment negative ratio: <strong>{alert.ratio}%</strong></span>
                    <span className="meta-dot">•</span>
                    <span>Total sample size: <strong>{alert.total} tweets</strong></span>
                  </div>
                </div>

                <div className="alert-card-actions">
                  <button
                    onClick={(e) => handleDismiss(alert.id, e)}
                    className="btn-dismiss-alert"
                    title="Dismiss alert"
                    aria-label={`Dismiss alert for ${alert.airlineName}`}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="alerts-empty-state">
            <CheckCircle size={32} className="success-icon" aria-hidden="true" />
            <h3 className="empty-title">No alerts match your filters</h3>
          </div>
        )}
      </div>
    </article>
  );
};
