import React, { useEffect, useState } from 'react';
import { Tag, Smile, RotateCcw } from 'lucide-react';
import { type DashboardFilters, fetchTopicsList } from '../services/api';

export interface ExploreFilters {
  sentiment?: string;
  topicId?: string;
}

interface FiltersBarProps {
  filters: ExploreFilters;
  onChange: (newFilters: ExploreFilters) => void;
}

export const FiltersBar: React.FC<FiltersBarProps> = ({ filters, onChange }) => {
  const [topics, setTopics] = useState<Array<{ topic_id: number; topic_name: string }>>([]);

  useEffect(() => {
    fetchTopicsList()
      .then((data) => {
        setTopics([...data].sort((a, b) => {
          if (a.topic_name === 'Not Specified') return 1;
          if (b.topic_name === 'Not Specified') return -1;
          return a.topic_name.localeCompare(b.topic_name);
        }));
      })
      .catch(() => {});
  }, []);

  const handleChange = (key: keyof ExploreFilters, value: string) => {
    onChange({ ...filters, [key]: value || undefined });
  };

  const handleReset = () => {
    onChange({ sentiment: undefined, topicId: undefined });
  };

  const hasActive = Object.values(filters).some((v) => v !== undefined && v !== '');

  return (
    <div className="filter-panel" aria-label="Explore filters">
      <div className="filter-group">
        <label htmlFor="explore-sentiment" className="filter-label">
          <Smile size={14} aria-hidden="true" />
          Sentiment
        </label>
        <select
          id="explore-sentiment"
          className="filter-select"
          value={filters.sentiment || ''}
          onChange={(e) => handleChange('sentiment', e.target.value)}
        >
          <option value="">All Sentiments</option>
          <option value="Positive">Positive</option>
          <option value="Neutral">Neutral</option>
          <option value="Negative">Negative</option>
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="explore-topic" className="filter-label">
          <Tag size={14} aria-hidden="true" />
          Topic
        </label>
        <select
          id="explore-topic"
          className="filter-select"
          value={filters.topicId || ''}
          onChange={(e) => handleChange('topicId', e.target.value)}
        >
          <option value="">All Topics</option>
          {topics.map((topic) => (
            <option key={topic.topic_id} value={topic.topic_id}>
              {topic.topic_name}
            </option>
          ))}
        </select>
      </div>

      {hasActive && (
        <button className="btn-reset-filters" onClick={handleReset} aria-label="Reset explore filters">
          <RotateCcw size={14} aria-hidden="true" />
          Reset
        </button>
      )}
    </div>
  );
};
