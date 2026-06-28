import React, { useEffect, useState } from 'react';
import { Plane, Calendar, RotateCcw } from 'lucide-react';
import { type DashboardFilters, fetchAirlinesList } from '../services/api';

export interface ContextFilters {
  airlineId?: string;
  startDate?: string;
  endDate?: string;
}

interface ContextBarProps {
  filters: ContextFilters;
  onChange: (newFilters: ContextFilters) => void;
}

export const ContextBar: React.FC<ContextBarProps> = ({ filters, onChange }) => {
  const [airlines, setAirlines] = useState<Array<{ airline_id: number; airline_name: string }>>([]);

  useEffect(() => {
    fetchAirlinesList()
      .then(setAirlines)
      .catch(() => {});
  }, []);

  const handleChange = (key: keyof ContextFilters, value: string) => {
    onChange({ ...filters, [key]: value || undefined });
  };

  const handleReset = () => {
    onChange({ airlineId: undefined, startDate: undefined, endDate: undefined });
  };

  const hasActive = Object.values(filters).some((v) => v !== undefined && v !== '');

  return (
    <div className="context-bar" aria-label="Context filters">
      <div className="filter-group">
        <label htmlFor="ctx-airline" className="filter-label">
          <Plane size={13} aria-hidden="true" />
          Airline
        </label>
        <select
          id="ctx-airline"
          className="filter-select"
          value={filters.airlineId || ''}
          onChange={(e) => handleChange('airlineId', e.target.value)}
        >
          <option value="">All Airlines</option>
          {airlines.map((a) => (
            <option key={a.airline_id} value={a.airline_id}>{a.airline_name}</option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="ctx-start" className="filter-label">
          <Calendar size={13} aria-hidden="true" />
          From
        </label>
        <input
          id="ctx-start"
          type="date"
          className="filter-input"
          value={filters.startDate || ''}
          onChange={(e) => handleChange('startDate', e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label htmlFor="ctx-end" className="filter-label">
          <Calendar size={13} aria-hidden="true" />
          To
        </label>
        <input
          id="ctx-end"
          type="date"
          className="filter-input"
          value={filters.endDate || ''}
          onChange={(e) => handleChange('endDate', e.target.value)}
        />
      </div>

      {hasActive && (
        <button className="btn-reset-filters" onClick={handleReset} aria-label="Reset context filters">
          <RotateCcw size={13} aria-hidden="true" />
          Reset
        </button>
      )}
    </div>
  );
};
