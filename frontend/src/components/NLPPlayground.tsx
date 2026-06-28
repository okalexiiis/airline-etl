import React, { useState, useRef } from 'react';
import {
  FlaskConical,
  Send,
  Loader2,
  Smile,
  Meh,
  Frown,
  Trash2,
  Plane,
  Tag,
  ClipboardPaste,
} from 'lucide-react';
import { analyzeText, type AnalyzeResult } from '../services/api';

// ─── Types ───────────────────────────────────────────────────────────────────
interface HistoryEntry {
  id: number;
  input: string;
  airline?: string;
  topic?: string;
  result: AnalyzeResult;
  timestamp: Date;
}

const SAMPLE_TWEETS = [
  "The flight attendants were absolutely amazing, best airline experience ever!",
  "3 hour delay and no explanation. Never flying with this airline again.",
  "Decent flight, nothing special but got there on time.",
  "Lost my luggage and customer service just hung up on me. Unacceptable.",
  "Upgraded to first class as a surprise! Made my whole trip.",
  "The WiFi was spotty but the seats were comfortable enough.",
];

// ─── Sentiment config ─────────────────────────────────────────────────────────
const SENTIMENT_CONFIG = {
  Positive: {
    icon: <Smile size={24} />,
    colorVar: 'var(--color-positive)',
    bgClass: 'sentiment-positive',
    glow: 'rgba(16, 185, 129, 0.25)',
    label: 'Positive',
  },
  Neutral: {
    icon: <Meh size={24} />,
    colorVar: 'var(--color-neutral)',
    bgClass: 'sentiment-neutral',
    glow: 'rgba(245, 158, 11, 0.25)',
    label: 'Neutral',
  },
  Negative: {
    icon: <Frown size={24} />,
    colorVar: 'var(--color-negative)',
    bgClass: 'sentiment-negative',
    glow: 'rgba(244, 63, 94, 0.25)',
    label: 'Negative',
  },
};

// ─── Component ─────────────────────────────────────────────────────────────────
export const NLPPlayground: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [airline, setAirline] = useState('');
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [latestResult, setLatestResult] = useState<HistoryEntry | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const idCounter = useRef(0);

  const handleAnalyze = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);

    try {
      const result = await analyzeText(
        trimmed,
        airline.trim() || undefined,
        topic.trim() || undefined,
      );

      const entry: HistoryEntry = {
        id: ++idCounter.current,
        input: trimmed,
        airline: airline.trim() || undefined,
        topic: topic.trim() || undefined,
        result,
        timestamp: new Date(),
      };

      setLatestResult(entry);
      setHistory((prev) => [entry, ...prev].slice(0, 20));
      setInputText('');
    } catch (err: any) {
      setError(err.message || 'Analysis failed. Ensure the NLP service is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleAnalyze();
    }
  };

  const handlePasteSample = () => {
    const random = SAMPLE_TWEETS[Math.floor(Math.random() * SAMPLE_TWEETS.length)];
    setInputText(random);
    textareaRef.current?.focus();
  };

  const clearHistory = () => {
    setHistory([]);
    setLatestResult(null);
  };

  const sentConfig = latestResult ? SENTIMENT_CONFIG[latestResult.result.sentiment] : null;

  return (
    <section className="playground-wrapper" aria-label="NLP Playground">
      {/* Header */}
      <div className="playground-header">
        <div className="playground-header-left">
          <div className="playground-icon-badge" aria-hidden="true">
            <FlaskConical size={20} color="#ffffff" />
          </div>
          <div>
            <h2 className="playground-title">NLP Playground</h2>
            <p className="playground-subtitle">
              Experimental · Test the BERTweet sentiment model in real-time
            </p>
          </div>
        </div>

      </div>

      {/* Main Layout: Input + Live Result */}
      <div className="playground-main-grid">
        {/* Left: Input Panel */}
        <div className="glass-card playground-input-panel">
          {/* Text input */}
          <div className="playground-field-group">
            <div className="playground-field-label-row">
              <label htmlFor="playground-text" className="filter-label">
                Tweet or Feedback Text
              </label>
              <button
                className="playground-paste-btn"
                onClick={handlePasteSample}
                type="button"
                title="Paste a random sample tweet"
              >
                <ClipboardPaste size={13} />
                Sample
              </button>
            </div>
            <textarea
              ref={textareaRef}
              id="playground-text"
              className="playground-textarea"
              placeholder="Type or paste a tweet to analyze… (Ctrl+Enter to run)"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={5}
              maxLength={560}
              aria-describedby="playground-char-count"
            />
            <div className="playground-char-count" id="playground-char-count" aria-live="polite">
              {inputText.length} / 560
            </div>
          </div>

          {/* Optional metadata row */}
          <div className="playground-meta-row">
            <div className="filter-group">
              <label htmlFor="playground-airline" className="filter-label">
                <Plane size={13} aria-hidden="true" />
                Airline (optional)
              </label>
              <input
                id="playground-airline"
                type="text"
                className="filter-input"
                placeholder="e.g. United"
                value={airline}
                onChange={(e) => setAirline(e.target.value)}
              />
            </div>
            <div className="filter-group">
              <label htmlFor="playground-topic" className="filter-label">
                <Tag size={13} aria-hidden="true" />
                Topic (optional)
              </label>
              <input
                id="playground-topic"
                type="text"
                className="filter-input"
                placeholder="e.g. Baggage"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="playground-error" role="alert">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            id="playground-analyze-btn"
            className="playground-analyze-btn"
            onClick={handleAnalyze}
            disabled={!inputText.trim() || loading}
            aria-label="Run sentiment analysis"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="playground-spinner" aria-hidden="true" />
                Analyzing…
              </>
            ) : (
              <>
                <Send size={16} aria-hidden="true" />
                Analyze Sentiment
              </>
            )}
          </button>
        </div>

        {/* Right: Live Result */}
        <div className="playground-result-panel">
          {latestResult && sentConfig ? (
            <div
              className="glass-card playground-result-card"
              style={{ '--result-glow': sentConfig.glow } as React.CSSProperties}
            >

              {/* Sentiment badge */}
              <div className="playground-result-header">
                <span className={`sentiment-chip ${sentConfig.bgClass} playground-result-chip`}>
                  {sentConfig.icon}
                  {sentConfig.label}
                </span>
                <time className="playground-result-time" dateTime={latestResult.timestamp.toISOString()}>
                  {latestResult.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </time>
              </div>

              {/* Confidence meter */}
              <div className="playground-confidence-section">
                <div className="playground-confidence-label-row">
                  <span className="filter-label">Confidence</span>
                  <span
                    className="playground-confidence-pct"
                    style={{ color: sentConfig.colorVar }}
                  >
                    {Math.round(latestResult.result.confidence * 100)}%
                  </span>
                </div>
                <div className="playground-confidence-bar-track" role="progressbar"
                  aria-valuenow={Math.round(latestResult.result.confidence * 100)}
                  aria-valuemin={0} aria-valuemax={100}
                >
                  <div
                    className="playground-confidence-bar-fill"
                    style={{
                      width: `${Math.round(latestResult.result.confidence * 100)}%`,
                      background: sentConfig.colorVar,
                      boxShadow: `0 0 10px ${sentConfig.glow}`,
                    }}
                  />
                </div>
              </div>

              {/* Original text */}
              <div className="playground-result-text-block">
                <p className="filter-label" style={{ marginBottom: '0.4rem' }}>Original Input</p>
                <p className="playground-result-original">{latestResult.input}</p>
              </div>

              {/* Cleaned text */}
              <div className="playground-result-text-block">
                <p className="filter-label" style={{ marginBottom: '0.4rem' }}>Cleaned Text (model input)</p>
                <p className="tweet-text-clean" style={{ fontSize: '0.8125rem' }}>
                  {latestResult.result.cleaned_text}
                </p>
              </div>

              {/* Metadata pills */}
              {(latestResult.airline || latestResult.topic) && (
                <div className="playground-meta-pills">
                  {latestResult.airline && (
                    <span className="playground-meta-pill">
                      <Plane size={11} /> {latestResult.airline}
                    </span>
                  )}
                  {latestResult.topic && (
                    <span className="playground-meta-pill">
                      <Tag size={11} /> {latestResult.topic}
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="glass-card playground-result-empty">
              <p className="playground-empty-hint">Enter text and click Analyze Sentiment</p>
            </div>
          )}
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="glass-card playground-history-panel">
          <div className="chart-title-group">
            <div>
              <h3 className="chart-title">Analysis History</h3>
              <p className="brand-subtitle">Last {history.length} predictions this session</p>
            </div>
            <button
              className="btn-reset-filters"
              onClick={clearHistory}
              aria-label="Clear analysis history"
            >
              <Trash2 size={13} aria-hidden="true" />
              Clear
            </button>
          </div>
          <div className="playground-history-list" role="list">
            {history.map((entry) => {
              const cfg = SENTIMENT_CONFIG[entry.result.sentiment];
              return (
                <article
                  key={entry.id}
                  className="playground-history-item"
                  role="listitem"
                  onClick={() => setLatestResult(entry)}
                  style={{ cursor: 'pointer' }}
                  title="Click to inspect this result"
                >
                  <span className={`sentiment-chip ${cfg.bgClass}`} style={{ flexShrink: 0 }}>
                    {cfg.icon}
                    {cfg.label}
                  </span>
                  <p className="playground-history-text">{entry.input}</p>
                  <span
                    className="playground-confidence-pct"
                    style={{ color: cfg.colorVar, flexShrink: 0 }}
                  >
                    {Math.round(entry.result.confidence * 100)}%
                  </span>
                  <time className="playground-result-time" style={{ flexShrink: 0 }}>
                    {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </time>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
