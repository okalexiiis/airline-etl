import React, { useState, useRef } from 'react';
import {
  Database,
  Download,
  Zap,
  Eye,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  UploadCloud,
  FileSpreadsheet,
  Trash2,
  Sparkles,
} from 'lucide-react';
import {
  type DatasetConfig,
  type GenerateAndLoadResult,
  type UploadResult,
  previewDataset,
  downloadDataset,
  generateAndLoad,
  uploadDatasetFile,
} from '../services/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_AIRLINES = ['Virgin America', 'United', 'Southwest', 'Delta', 'US Airways', 'American'];

const ALL_TOPICS = [
  'Late Flight',
  'Customer Service Issue',
  'Cancelled Flight',
  'Lost Luggage',
  'Bad Flight',
  'Flight Booking Problems',
  'Flight Attendant Complaints',
  'Damaged Luggage',
  'longlines',
  "Can't Tell",
];

const DEFAULT_CONFIG: DatasetConfig = {
  n_records: 200,
  airlines: [...ALL_AIRLINES],
  sentiment_positive: 20,
  sentiment_neutral: 20,
  sentiment_negative: 60,
  topics: [...ALL_TOPICS],
  start_date: '2015-02-16',
  end_date: '2015-02-24',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ResultBanner({
  variant,
  Icon,
  title,
  subtitle,
  className,
}: {
  variant: 'success' | 'error';
  Icon: React.ComponentType<{ size?: number }>;
  title: string;
  subtitle: React.ReactNode;
  className?: string;
}) {
  const role = variant === 'success' ? 'status' : 'alert';
  return (
    <div className={`glass-card dg-result-banner dg-result-${variant}${className ? ` ${className}` : ''}`} role={role}>
      <div className="dg-result-icon"><Icon size={18} /></div>
      <div>
        <p className="dg-result-title">{title}</p>
        <p className="dg-result-subtitle">{subtitle}</p>
      </div>
    </div>
  );
}

function CheckboxGroup({
  label,
  all,
  selected,
  onChange,
}: {
  label: string;
  all: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const allChecked = selected.length === all.length;
  const toggle = (val: string) => {
    if (selected.includes(val)) {
      onChange(selected.filter((s) => s !== val));
    } else {
      onChange([...selected, val]);
    }
  };
  const toggleAll = () => onChange(allChecked ? [] : [...all]);

  return (
    <div className="dg-checkbox-group">
      <div className="dg-checkbox-group-header">
        <span className="filter-label">{label}</span>
        <button className="playground-paste-btn" onClick={toggleAll} type="button">
          {allChecked ? 'Deselect All' : 'Select All'}
        </button>
      </div>
      <div className="dg-checkbox-list">
        {all.map((item) => (
          <label key={item} className="dg-checkbox-item">
            <input
              type="checkbox"
              className="dg-checkbox"
              checked={selected.includes(item)}
              onChange={() => toggle(item)}
            />
            <span>{item}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function SentimentSliders({
  pos,
  neu,
  neg,
  onChange,
}: {
  pos: number;
  neu: number;
  neg: number;
  onChange: (pos: number, neu: number, neg: number) => void;
}) {
  const total = pos + neu + neg;
  const warn = total !== 100;

  const handleChange = (key: 'pos' | 'neu' | 'neg', val: number) => {
    let p = key === 'pos' ? val : pos;
    let n = key === 'neu' ? val : neu;
    let g = key === 'neg' ? val : neg;
    onChange(p, n, g);
  };

  return (
    <div className="dg-sentiment-sliders">
      <div className="dg-slider-row">
        <span className="dg-slider-label positive-text">Positive</span>
        <input
          type="range" min={0} max={100} value={pos}
          className="dg-range dg-range-positive"
          onChange={(e) => handleChange('pos', Number(e.target.value))}
        />
        <span className="dg-slider-pct positive-text">{pos}%</span>
      </div>
      <div className="dg-slider-row">
        <span className="dg-slider-label neutral-text">Neutral</span>
        <input
          type="range" min={0} max={100} value={neu}
          className="dg-range dg-range-neutral"
          onChange={(e) => handleChange('neu', Number(e.target.value))}
        />
        <span className="dg-slider-pct neutral-text">{neu}%</span>
      </div>
      <div className="dg-slider-row">
        <span className="dg-slider-label negative-text">Negative</span>
        <input
          type="range" min={0} max={100} value={neg}
          className="dg-range dg-range-negative"
          onChange={(e) => handleChange('neg', Number(e.target.value))}
        />
        <span className="dg-slider-pct negative-text">{neg}%</span>
      </div>
      <div className={`dg-total-badge ${warn ? 'dg-total-warn' : 'dg-total-ok'}`}>
        Total: {total}% {warn ? '⚠ Must equal 100' : '✓'}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const DatasetGenerator: React.FC = () => {
  // Sub-tabs: 'generate' | 'upload'
  const [subTab, setSubTab] = useState<'generate' | 'upload'>('generate');

  // Generator states
  const [config, setConfig] = useState<DatasetConfig>(DEFAULT_CONFIG);
  const [previewRows, setPreviewRows] = useState<string[][] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [loadLoading, setLoadLoading] = useState(false);
  const [loadResult, setLoadResult] = useState<GenerateAndLoadResult | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [downloadLoading, setDownloadLoading] = useState(false);

  // Uploader states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalSentiment = config.sentiment_positive + config.sentiment_neutral + config.sentiment_negative;
  const isValidConfig =
    config.airlines.length > 0 &&
    config.topics.length > 0 &&
    totalSentiment === 100;

  const patch = (partial: Partial<DatasetConfig>) =>
    setConfig((prev) => ({ ...prev, ...partial }));

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG);
    setPreviewRows(null);
    setLoadResult(null);
    setLoadError(null);
    setPreviewError(null);
    setSelectedFile(null);
    setUploadResult(null);
    setUploadError(null);
  };

  const handlePreview = async () => {
    if (!isValidConfig) return;
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewRows(null);
    try {
      const rows = await previewDataset(config);
      setPreviewRows(rows);
    } catch (e: any) {
      setPreviewError(e.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDownload = () => {
    if (!isValidConfig) return;
    setDownloadLoading(true);
    try {
      downloadDataset(config);
    } finally {
      setTimeout(() => setDownloadLoading(false), 1500);
    }
  };

  const handleGenerateAndLoad = async () => {
    if (!isValidConfig) return;
    setLoadLoading(true);
    setLoadResult(null);
    setLoadError(null);
    try {
      const result = await generateAndLoad(config);
      setLoadResult(result);
    } catch (e: any) {
      setLoadError(e.message);
    } finally {
      setLoadLoading(false);
    }
  };

  // Drag & drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.csv')) {
        setSelectedFile(file);
        setUploadError(null);
        setUploadResult(null);
      } else {
        setUploadError('Only CSV files are supported.');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setUploadError(null);
      setUploadResult(null);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploadLoading(true);
    setUploadError(null);
    setUploadResult(null);
    try {
      const result = await uploadDatasetFile(selectedFile);
      setUploadResult(result);
      setSelectedFile(null); // Clear after upload
    } catch (e: any) {
      setUploadError(e.message || 'File upload failed. Ensure Python & backend services are active.');
    } finally {
      setUploadLoading(false);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setUploadError(null);
  };

  return (
    <section className="playground-wrapper" aria-label="Dataset Manager">
      {/* Header */}
      <div className="playground-header">
        <div className="playground-header-left">
          <div className="dg-icon-badge" aria-hidden="true">
            <Database size={20} color="#ffffff" />
          </div>
          <div>
            <h2 className="playground-title">Dataset Manager</h2>
            <p className="playground-subtitle">
              Configure &amp; generate synthetic CSV data or import your own datasets directly into the database
            </p>
          </div>
        </div>
        
        {/* Toggle options */}
        <div className="dg-sub-nav">
          <button 
            className={`dg-sub-tab ${subTab === 'generate' ? 'active' : ''}`}
            onClick={() => setSubTab('generate')}
          >
            <Sparkles size={13} />
            Generate Synthetic
          </button>
          <button 
            className={`dg-sub-tab ${subTab === 'upload' ? 'active' : ''}`}
            onClick={() => setSubTab('upload')}
          >
            <UploadCloud size={13} />
            Upload CSV
          </button>
        </div>

        <button className="btn-reset-filters" onClick={handleReset} title="Reset all settings">
          <RotateCcw size={13} aria-hidden="true" /> Reset
        </button>
      </div>

      {subTab === 'generate' ? (
        <>
          {/* Main generator layout */}
          <div className="dg-main-grid">
            {/* Left column: config */}
            <div className="dg-config-col">
              {/* Record count */}
              <div className="glass-card dg-section">
                <label htmlFor="dg-n-records" className="filter-label dg-section-label">
                  Number of Records
                </label>
                <div className="dg-count-row">
                  <input
                    id="dg-n-records"
                    type="range"
                    min={10} max={5000} step={10}
                    value={config.n_records}
                    className="dg-range dg-range-primary"
                    onChange={(e) => patch({ n_records: Number(e.target.value) })}
                  />
                  <input
                    type="number"
                    className="filter-input dg-count-input"
                    min={10} max={5000}
                    value={config.n_records}
                    onChange={(e) => patch({ n_records: Math.max(10, Math.min(5000, Number(e.target.value))) })}
                  />
                </div>
              </div>

              {/* Sentiment distribution */}
              <div className="glass-card dg-section">
                <p className="filter-label" style={{ marginBottom: '0.875rem' }}>Sentiment Distribution</p>
                <SentimentSliders
                  pos={config.sentiment_positive}
                  neu={config.sentiment_neutral}
                  neg={config.sentiment_negative}
                  onChange={(p, n, g) =>
                    patch({ sentiment_positive: p, sentiment_neutral: n, sentiment_negative: g })
                  }
                />
              </div>

              {/* Date range */}
              <div className="glass-card dg-section">
                <p className="filter-label" style={{ marginBottom: '0.875rem' }}>Date Range</p>
                <div className="playground-meta-row">
                  <div className="filter-group">
                    <label htmlFor="dg-start-date" className="filter-label">Start</label>
                    <input
                      id="dg-start-date"
                      type="date"
                      className="filter-input"
                      value={config.start_date}
                      onChange={(e) => patch({ start_date: e.target.value })}
                    />
                  </div>
                  <div className="filter-group">
                    <label htmlFor="dg-end-date" className="filter-label">End</label>
                    <input
                      id="dg-end-date"
                      type="date"
                      className="filter-input"
                      value={config.end_date}
                      onChange={(e) => patch({ end_date: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right column: checkboxes */}
            <div className="dg-config-col">
              <div className="glass-card dg-section">
                <CheckboxGroup
                  label="Airlines"
                  all={ALL_AIRLINES}
                  selected={config.airlines}
                  onChange={(v) => patch({ airlines: v })}
                />
              </div>
              <div className="glass-card dg-section">
                <CheckboxGroup
                  label="Complaint Topics (for Negative tweets)"
                  all={ALL_TOPICS}
                  selected={config.topics}
                  onChange={(v) => patch({ topics: v })}
                />
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="glass-card dg-action-bar">
            <div className="dg-record-summary">
              <span className="dg-record-count">{config.n_records.toLocaleString()}</span>
              <span className="brand-subtitle">tweets to generate</span>
              {!isValidConfig && (
                <span className="dg-config-warn">
                  <AlertTriangle size={13} /> Fix config before generating
                </span>
              )}
            </div>

            <div className="dg-action-buttons">
              {/* Preview */}
              <button
                id="dg-preview-btn"
                className="dg-btn dg-btn-ghost"
                onClick={handlePreview}
                disabled={!isValidConfig || previewLoading}
              >
                {previewLoading
                  ? <><Loader2 size={15} className="playground-spinner" /> Previewing…</>
                  : <><Eye size={15} /> Preview 10 rows</>
                }
              </button>

              {/* Download */}
              <button
                id="dg-download-btn"
                className="dg-btn dg-btn-secondary"
                onClick={handleDownload}
                disabled={!isValidConfig || downloadLoading}
              >
                {downloadLoading
                  ? <><Loader2 size={15} className="playground-spinner" /> Preparing…</>
                  : <><Download size={15} /> Download CSV</>
                }
              </button>

              {/* Generate & Load */}
              <button
                id="dg-load-btn"
                className="dg-btn dg-btn-primary"
                onClick={handleGenerateAndLoad}
                disabled={!isValidConfig || loadLoading}
              >
                {loadLoading
                  ? <><Loader2 size={15} className="playground-spinner" /> Loading into DB…</>
                  : <><Zap size={15} /> Generate &amp; Load into DB</>
                }
              </button>
            </div>
          </div>

          {/* Load result / error */}
          {loadResult && (
            <ResultBanner variant="success" Icon={CheckCircle2}
              title="Successfully loaded into database"
              subtitle={<><strong>{loadResult.inserted.toLocaleString()}</strong> rows inserted ·{' '}
                <strong>{loadResult.skipped}</strong> skipped ·{' '}
                <strong>{loadResult.generated.toLocaleString()}</strong> generated</>}
            />
          )}

          {loadError && (
            <ResultBanner variant="error" Icon={AlertTriangle}
              title="Load failed"
              subtitle={loadError}
            />
          )}

          {/* CSV Preview table */}
          {previewError && (
            <p className="playground-error" role="alert">{previewError}</p>
          )}

          {previewRows && previewRows.length > 0 && (
            <div className="glass-card dg-preview-panel">
              <div className="chart-title-group">
                <div>
                  <h3 className="chart-title">Preview</h3>
                  <p className="brand-subtitle">First 10 rows of the generated dataset</p>
                </div>
              </div>
              <div className="tweets-table-container">
                <table className="tweets-table" aria-label="Dataset preview">
                  <thead>
                    <tr>
                      {previewRows[0].map((col, i) => (
                        <th key={i}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.slice(1).map((row, ri) => (
                      <tr key={ri}>
                        {row.map((cell, ci) => (
                          <td key={ci} style={{ maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Upload Dataset Section */
        <div className="dg-upload-container">
          <div className="glass-card dg-upload-card">
            <h3 className="chart-title" style={{ marginBottom: '0.5rem' }}>Upload Custom CSV Dataset</h3>
            <p className="brand-subtitle" style={{ marginBottom: '1.5rem' }}>
              Import tweets into the database using our ingestion pipeline. Sentiments will be re-predicted using the BERTweet NLP model.
            </p>

            {/* Dropzone area */}
            <div
              className={`dg-dropzone ${dragActive ? 'drag-active' : ''} ${selectedFile ? 'has-file' : ''}`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={selectedFile ? undefined : triggerFileSelect}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="sr-only"
                onChange={handleFileSelect}
              />

              {!selectedFile ? (
                <div className="dg-dropzone-content">
                  <UploadCloud size={48} className="dg-upload-icon-pulse" />
                  <p className="dg-dropzone-text">
                    Drag and drop your <strong>.csv</strong> file here, or <span className="dg-browse-link">browse files</span>
                  </p>
                  <p className="dg-dropzone-subtext">Max size: 50MB</p>
                </div>
              ) : (
                <div className="dg-file-selected-info">
                  <FileSpreadsheet size={40} className="dg-file-icon" />
                  <div className="dg-file-details">
                    <p className="dg-file-name">{selectedFile.name}</p>
                    <p className="dg-file-size">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button 
                    type="button" 
                    className="dg-remove-file-btn" 
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSelectedFile();
                    }}
                    title="Remove selected file"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="dg-upload-actions">
              <button
                type="button"
                className="dg-btn dg-btn-primary dg-btn-full"
                onClick={handleUpload}
                disabled={!selectedFile || uploadLoading}
              >
                {uploadLoading ? (
                  <>
                    <Loader2 size={16} className="playground-spinner" />
                    Processing & Ingesting Dataset...
                  </>
                ) : (
                  <>
                    <UploadCloud size={16} />
                    Upload and Process CSV
                  </>
                )}
              </button>
            </div>

            {/* Results banners */}
            {uploadResult && (
              <ResultBanner variant="success" Icon={CheckCircle2}
                title="Successfully loaded dataset into database"
                subtitle={<><strong>{uploadResult.inserted.toLocaleString()}</strong> rows successfully ingested ·{' '}
                  <strong>{uploadResult.skipped.toLocaleString()}</strong> skipped rows (unclean/too short).</>}
                className="dg-result-banner-mt"
              />
            )}

            {uploadError && (
              <ResultBanner variant="error" Icon={AlertTriangle}
                title="Upload Failed"
                subtitle={uploadError}
                className="dg-result-banner-mt"
              />
            )}
          </div>

          {/* Schema Guide card */}
          <div className="glass-card dg-schema-guide-card">
            <h4 className="filter-label" style={{ fontSize: '0.85rem', marginBottom: '0.875rem', color: 'var(--color-text-primary)' }}>
              Required CSV Schema
            </h4>
            <p className="brand-subtitle" style={{ marginBottom: '1.25rem', lineHeight: '1.5' }}>
              Your file must be a standard comma-separated values (CSV) file containing the following columns:
            </p>
            <div className="dg-schema-columns-list">
              <div className="dg-schema-col-item">
                <span className="dg-col-badge">tweet_id</span>
                <span className="dg-col-desc">Unique 64-bit integer identifier (int64)</span>
              </div>
              <div className="dg-schema-col-item">
                <span className="dg-col-badge">text</span>
                <span className="dg-col-desc">Raw tweet text content to analyze</span>
              </div>
              <div className="dg-schema-col-item">
                <span className="dg-col-badge">airline</span>
                <span className="dg-col-desc">Name of the target airline</span>
              </div>
              <div className="dg-schema-col-item">
                <span className="dg-col-badge">tweet_created</span>
                <span className="dg-col-desc">Date timestamp string (e.g. YYYY-MM-DD HH:MM:SS)</span>
              </div>
              <div className="dg-schema-col-item">
                <span className="dg-col-badge">airline_sentiment</span>
                <span className="dg-col-desc">Default sentiment: positive / neutral / negative</span>
              </div>
              <div className="dg-schema-col-item">
                <span className="dg-col-badge">negativereason</span>
                <span className="dg-col-desc">Optional category of negative feedback (e.g. Late Flight)</span>
              </div>
            </div>
            <div className="dg-schema-note">
              <AlertTriangle size={14} style={{ color: 'var(--color-neutral)', flexShrink: 0, marginTop: '0.1rem' }} />
              <p className="dg-schema-note-text">
                Note: Tweets with less than 5 characters of cleaned text will be skipped during analysis. Sentiment predictions are automatically run through the RoBERTa model to keep facts standardized.
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
