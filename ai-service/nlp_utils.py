import re
import emoji
import pandas as pd
from sqlalchemy import text
from typing import Optional, Any
from functools import lru_cache

# ─── Sentiment model — single source, lazy-loaded ──────────────────────────────

_MODEL: Optional[Any] = None

LABEL_MAP = {
    "LABEL_0": "Negative",
    "LABEL_1": "Neutral",
    "LABEL_2": "Positive",
    "negative": "Negative",
    "neutral":  "Neutral",
    "positive": "Positive",
    "NEGATIVE": "Negative",
    "NEUTRAL":  "Neutral",
    "POSITIVE": "Positive",
}

def get_sentiment_pipeline():
    """Return the HuggingFace sentiment pipeline (singleton, lazy-loaded)."""
    global _MODEL
    if _MODEL is not None:
        return _MODEL
    from transformers import pipeline as hf_pipeline
    _MODEL = hf_pipeline(
        "text-classification",
        model="cardiffnlp/twitter-roberta-base-sentiment-latest",
        max_length=128,
        truncation=True,
    )
    return _MODEL


# ─── Batch inference ──────────────────────────────────────────────────────────

def batch_predict(texts: list[str], batch_size: int = 32) -> list[tuple[str, float]]:
    """
    Run the sentiment pipeline on a batch of texts.
    Returns a list of (sentiment_label, confidence) in the same order as input.
    """
    if not texts:
        return []
    model = get_sentiment_pipeline()
    results = model(texts, batch_size=batch_size, truncation=True)
    return [
        (LABEL_MAP.get(r['label'], r['label']), round(r['score'], 4))
        for r in results
    ]


# ─── Cached single-tweet inference (for /analyze) ─────────────────────────────

@lru_cache(maxsize=512)
def cached_inference(clean_text: str) -> tuple[str, float]:
    """Cached single-tweet inference. Returns (sentiment, confidence)."""
    model = get_sentiment_pipeline()
    result = model(clean_text)[0]
    return LABEL_MAP.get(result['label'], result['label']), round(result['score'], 4)


# ─── Text cleaning ─────────────────────────────────────────────────────────────

_URL_RE = re.compile(r'http\S+')
_MENTION_RE = re.compile(r'@\w+')
_HASHTAG_RE = re.compile(r'#(\w+)')
_SPECIAL_CHAR_RE = re.compile(r'[^a-zA-Z0-9\s:_áéíóúüñÁÉÍÓÚÜÑ]')
_WHITESPACE_RE = re.compile(r'\s+')

def clean_tweet(text_str: str) -> str:
    """Clean a tweet for NLP processing."""
    if not isinstance(text_str, str):
        return ""
    text_str = _URL_RE.sub('', text_str)
    text_str = _MENTION_RE.sub('', text_str)
    text_str = _HASHTAG_RE.sub(r'\1', text_str)
    text_str = emoji.demojize(text_str, delimiters=(" ", " "))
    text_str = _SPECIAL_CHAR_RE.sub('', text_str)
    text_str = _WHITESPACE_RE.sub(' ', text_str).strip()
    return text_str.lower()


# ─── Dimension helpers (upsert-safe) ───────────────────────────────────────────

def get_or_create_dim(conn, table: str, id_col: str, name_col: str, value: str) -> int:
    """Get or create a dimension row. Uses ON CONFLICT upsert to avoid races."""
    row = conn.execute(
        text(f"""
            INSERT INTO {table} ({name_col})
            VALUES (:val)
            ON CONFLICT ({name_col}) DO UPDATE SET {name_col} = EXCLUDED.{name_col}
            RETURNING {id_col}
        """),
        {"val": value}
    ).fetchone()
    return row[0]

def get_or_create_date(conn, date_str: str) -> int:
    """Insert or retrieve a date in DimDate. Uses ON CONFLICT upsert."""
    dt = pd.to_datetime(date_str, utc=True)
    row = conn.execute(
        text("""
            INSERT INTO DimDate (full_date, day, month, year, day_of_week)
            VALUES (:d, :day, :month, :year, :dow)
            ON CONFLICT (full_date) DO UPDATE SET full_date = EXCLUDED.full_date
            RETURNING date_id
        """),
        {
            "d":    dt.date(),
            "day":  dt.day,
            "month": dt.month,
            "year": dt.year,
            "dow":  dt.strftime("%A")
        }
    ).fetchone()
    return row[0]


# ─── Shared ETL insert helper (used by API + CLI) ──────────────────────────────

_INSERT_FACT_SQL = """
    INSERT INTO FactSentimentAnalysis
        (tweet_text, tweet_text_clean, sentiment, confidence,
         date_id, airline_id, platform_id, topic_id)
    VALUES (:raw, :clean, :sent, :conf, :did, :aid, :pid, :tid)
"""


def _resolve_dims(conn, df):
    """
    Pre-resolve all unique dimension values into dicts {value -> id}.
    Called once per ETL run instead of per-row.
    """
    platform_id = get_or_create_dim(conn, "DimPlatform", "platform_id", "platform_name", "Twitter")

    airline_ids = {}
    for name in df['airline'].dropna().unique():
        airline_ids[name] = get_or_create_dim(conn, "DimAirline", "airline_id", "airline_name", name)

    topic_ids = {}
    for name in df['negativereason'].dropna().unique():
        topic_ids[name] = get_or_create_dim(conn, "DimTopic", "topic_id", "topic_name", name)

    date_ids = {}
    for ts in df['tweet_created'].dropna().unique():
        date_ids[ts] = get_or_create_date(conn, ts)

    return platform_id, airline_ids, topic_ids, date_ids


def etl_insert(conn, df, use_model: bool = True) -> dict:
    """
    Insert a DataFrame of tweets into the star-schema warehouse.
    Shared between the API (/etl/run, /dataset/generate-and-load) and CLI (etl_pipeline.py).

    Args:
        conn: SQLAlchemy connection (inside an engine.begin() block).
        df: DataFrame with columns [text, airline, tweet_created, negativereason,
             airline_sentiment, airline_sentiment_confidence].
        use_model: If True, re-runs sentiment inference on clean text.
                   If False, uses df['airline_sentiment'] labels directly.

    Returns: {"inserted": int, "skipped": int}
    """
    # 1. Pre-compute cleaned texts and filter short ones
    clean_texts = [clean_tweet(t) for t in df['text']]
    valid_mask = [len(ct) >= 5 for ct in clean_texts]

    skipped = sum(1 for v in valid_mask if not v)

    valid_indices = [i for i, v in enumerate(valid_mask) if v]
    valid_df = df.iloc[valid_indices].reset_index(drop=True)
    valid_clean = [clean_texts[i] for i in valid_indices]

    if len(valid_df) == 0:
        return {"inserted": 0, "skipped": skipped}

    # 2. Batch inference (or use existing labels)
    if use_model:
        predictions = batch_predict(valid_clean)
    else:
        predictions = [
            (row['airline_sentiment'].capitalize(), float(row['airline_sentiment_confidence']))
            for _, row in valid_df.iterrows()
        ]

    # 3. Pre-resolve all dimension IDs (one call per unique value)
    platform_id, airline_ids, topic_ids, date_ids = _resolve_dims(conn, df)

    # 4. Build fact row parameters in one pass
    fact_rows = []
    for idx, (_, row) in enumerate(valid_df.iterrows()):
        sentiment, confidence = predictions[idx]
        fact_rows.append({
            "raw":  row['text'],
            "clean": valid_clean[idx],
            "sent":  sentiment,
            "conf":  confidence,
            "did":   date_ids.get(row['tweet_created']),
            "aid":   airline_ids.get(row['airline']),
            "pid":   platform_id,
            "tid":   topic_ids.get(row['negativereason']),
        })

    # 5. Bulk insert via executemany (single round-trip)
    conn.execute(text(_INSERT_FACT_SQL), fact_rows)

    return {"inserted": len(fact_rows), "skipped": skipped}
