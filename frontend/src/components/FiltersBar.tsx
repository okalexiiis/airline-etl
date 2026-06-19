import React, { useEffect, useState } from 'react';
import { 
  Plane, 
  Tag, 
  Smile, 
  Calendar, 
  RotateCcw 
} from 'lucide-react';
import { 
  type DashboardFilters, 
  fetchAirlinesList, 
  fetchTopicsList 
} from '../services/api';

interface FiltersBarProps {
  filters: DashboardFilters;
  onFilterChange: (newFilters: DashboardFilters) => void;
}

export const FiltersBar: React.FC<FiltersBarProps> = ({ filters, onFilterChange }) => {
  const [airlines, setAirlines] = useState<Array<{ airline_id: number; airline_name: string }>>([]);
  const [topics, setTopics] = useState<Array<{ topic_id: number; topic_name: string }>>([]);

  useEffect(() => {
    // Fetch filter options from dimensions on load
    const loadFilterOptions = async () => {
      try {
        const [airlinesData, topicsData] = await Promise.all([
          fetchAirlinesList(),
          fetchTopicsList()
        ]);
        setAirlines(airlinesData);
        // Sort topics, but keep "Not Specified" at the end if possible
        const sortedTopics = [...topicsData].sort((a, b) => {
          if (a.topic_name === 'Not Specified') return 1;
          if (b.topic_name === 'Not Specified') return -1;
          return a.topic_name.localeCompare(b.topic_name);
        });
        setTopics(sortedTopics);
      } catch (error) {
        console.error('Failed to load filter options:', error);
      }
    };

    loadFilterOptions();
  }, []);

  const handleSelectChange = (key: keyof DashboardFilters, value: string) => {
    onFilterChange({
      ...filters,
      [key]: value || undefined, // undefined removes the filter from query params
    });
  };

  const handleReset = () => {
    onFilterChange({
      airlineId: undefined,
      platformId: undefined,
      topicId: undefined,
      sentiment: undefined,
      startDate: undefined,
      endDate: undefined,
    });
  };

  const hasActiveFilters = Object.values(filters).some(val => val !== undefined && val !== '');

  return (
    <article className="glass-card filter-panel" aria-label="Filters Panel">
      {/* Airline Filter */}
      <div className="filter-group">
        <label htmlFor="airline-filter" className="filter-label">
          <Plane size={14} aria-hidden="true" />
          Airline
        </label>
        <select
          id="airline-filter"
          className="filter-select"
          value={filters.airlineId || ''}
          onChange={(e) => handleSelectChange('airlineId', e.target.value)}
        >
          <option value="">All Airlines</option>
          {airlines.map((airline) => (
            <option key={airline.airline_id} value={airline.airline_id}>
              {airline.airline_name}
            </option>
          ))}
        </select>
      </div>

      {/* Sentiment Filter */}
      <div className="filter-group">
        <label htmlFor="sentiment-filter" className="filter-label">
          <Smile size={14} aria-hidden="true" />
          Sentiment
        </label>
        <select
          id="sentiment-filter"
          className="filter-select"
          value={filters.sentiment || ''}
          onChange={(e) => handleSelectChange('sentiment', e.target.value)}
        >
          <option value="">All Sentiments</option>
          <option value="Positive">Positive</option>
          <option value="Neutral">Neutral</option>
          <option value="Negative">Negative</option>
        </select>
      </div>

      {/* Topic Filter */}
      <div className="filter-group">
        <label htmlFor="topic-filter" className="filter-label">
          <Tag size={14} aria-hidden="true" />
          Topic/Complaint
        </label>
        <select
          id="topic-filter"
          className="filter-select"
          value={filters.topicId || ''}
          onChange={(e) => handleSelectChange('topicId', e.target.value)}
        >
          <option value="">All Topics</option>
          {topics.map((topic) => (
            <option key={topic.topic_id} value={topic.topic_id}>
              {topic.topic_name}
            </option>
          ))}
        </select>
      </div>

      {/* Start Date */}
      <div className="filter-group">
        <label htmlFor="start-date-filter" className="filter-label">
          <Calendar size={14} aria-hidden="true" />
          From Date
        </label>
        <input
          id="start-date-filter"
          type="date"
          className="filter-input"
          value={filters.startDate || ''}
          onChange={(e) => handleSelectChange('startDate', e.target.value)}
        />
      </div>

      {/* End Date */}
      <div className="filter-group">
        <label htmlFor="end-date-filter" className="filter-label">
          <Calendar size={14} aria-hidden="true" />
          To Date
        </label>
        <input
          id="end-date-filter"
          type="date"
          className="filter-input"
          value={filters.endDate || ''}
          onChange={(e) => handleSelectChange('endDate', e.target.value)}
        />
      </div>

      {/* Reset Button */}
      {hasActiveFilters && (
        <button 
          className="btn-reset-filters"
          onClick={handleReset}
          aria-label="Reset all filters"
        >
          <RotateCcw size={14} aria-hidden="true" />
          Reset
        </button>
      )}
    </article>
  );
};
