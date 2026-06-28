import os
import shutil
import tempfile
import logging
import pandas as pd
from fastapi import FastAPI, File, UploadFile, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional, List
from io import BytesIO
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
)
logger = logging.getLogger('aerosent')

from nlp_utils import (
    LABEL_MAP,
    get_sentiment_pipeline,
    clean_tweet,
    cached_inference,
    etl_insert,
)
from dataset_generator import generate_dataset, dataframe_to_csv_bytes

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")
AI_API_KEY = os.getenv("AI_API_KEY")

if not DATABASE_URL:
    raise RuntimeError("No se encontro DATABASE_URL en el archivo .env")

engine = create_engine(DATABASE_URL)

logger.info("Cargando modelo de sentimiento...")
get_sentiment_pipeline()  # pre-warm on startup
logger.info("Modelo cargado.")

app = FastAPI(title="AeroSent NLP API", description="NLP Sentiment Analysis service for AeroSent")


# ─── API Key middleware ────────────────────────────────────────────────────────

@app.middleware("http")
async def verify_api_key(request: Request, call_next):
    if request.url.path in ("/health", "/ready"):
        return await call_next(request)
    if AI_API_KEY:
        key = request.headers.get("X-API-Key")
        if not key or key != AI_API_KEY:
            raise HTTPException(status_code=401, detail="Invalid or missing API key")
    return await call_next(request)


# ─── Health probes ─────────────────────────────────────────────────────────────

@app.get("/health")
async def health_check():
    return {"status": "ok"}

@app.get("/ready")
async def readiness_check():
    if get_sentiment_pipeline() is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as e:
        logger.exception("Readiness check failed")
        raise HTTPException(status_code=503, detail="Database not reachable")
    return {"status": "ready"}


# ─── Pydantic Models ──────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=560, description="Tweet or feedback text to analyze")
    airline: Optional[str] = Field(None, description="Optional airline name")
    topic: Optional[str] = Field(None, description="Optional topic or complaint category")

class AnalyzeResponse(BaseModel):
    cleaned_text: str
    sentiment: str
    confidence: float

class GenerateAndLoadRequest(BaseModel):
    n_records: int = Field(100, ge=1, le=5000, description="Total number of tweets to generate")
    airlines: Optional[List[str]] = Field(None, description="Airlines to include")
    sentiment_positive: int = Field(20, ge=0, le=100)
    sentiment_neutral: int = Field(20, ge=0, le=100)
    sentiment_negative: int = Field(60, ge=0, le=100)
    topics: Optional[List[str]] = Field(None, description="Negative-reason topics to distribute")
    start_date: Optional[str] = Field(None, description="Earliest tweet date (YYYY-MM-DD)")
    end_date: Optional[str] = Field(None, description="Latest tweet date (YYYY-MM-DD)")


# ─── NLP Inference ────────────────────────────────────────────────────────────

@app.post("/analyze", response_model=AnalyzeResponse)
def analyze_text(request: AnalyzeRequest):
    """Analyze a single tweet. Uses LRU cache for repeated inputs."""
    try:
        clean_txt = clean_tweet(request.text)
        if not clean_txt:
            raise HTTPException(status_code=400, detail="Text is empty or invalid after cleaning")

        sentiment, confidence = cached_inference(clean_txt)

        return AnalyzeResponse(
            cleaned_text=clean_txt,
            sentiment=sentiment,
            confidence=confidence
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Inference failed")
        raise HTTPException(status_code=500, detail="Inference failed")


# ─── ETL Upload ───────────────────────────────────────────────────────────────

@app.post("/etl/run")
def run_etl_upload(file: UploadFile = File(...)):
    """Upload a CSV and run the ETL pipeline (batch inference + bulk insert)."""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".csv") as tmp:
        shutil.copyfileobj(file.file, tmp)
        temp_file_path = tmp.name

    try:
        df = pd.read_csv(temp_file_path)

        required_cols = ['tweet_id', 'text', 'airline', 'airline_sentiment',
                         'airline_sentiment_confidence', 'negativereason', 'tweet_created']
        missing_cols = [col for col in required_cols if col not in df.columns]
        if missing_cols:
            raise HTTPException(status_code=400, detail=f"CSV is missing required columns: {missing_cols}")

        df = df[required_cols].dropna(subset=['text', 'airline', 'tweet_created'])
        df['negativereason'] = df['negativereason'].fillna("Not Specified")

        with engine.begin() as conn:
            result = etl_insert(conn, df, use_model=True)

        return {"success": True, **result}

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("ETL execution failed")
        raise HTTPException(status_code=500, detail="ETL execution failed")
    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)


# ─── Dataset Generator ────────────────────────────────────────────────────────

@app.get("/dataset/generate")
def dataset_generate(
    n_records: int = Query(100, ge=1, le=5000, description="Number of rows to generate"),
    airlines: Optional[str] = Query(None, description="Comma-separated airline names"),
    sentiment_positive: int = Query(20, ge=0, le=100),
    sentiment_neutral: int = Query(20, ge=0, le=100),
    sentiment_negative: int = Query(60, ge=0, le=100),
    topics: Optional[str] = Query(None, description="Comma-separated topic names"),
    start_date: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="End date YYYY-MM-DD"),
):
    """Generate a synthetic tweet CSV and stream it as a file download."""
    try:
        airline_list = [a.strip() for a in airlines.split(",")] if airlines else None
        topic_list = [t.strip() for t in topics.split(",")] if topics else None
        dist = {
            "positive": sentiment_positive,
            "neutral": sentiment_neutral,
            "negative": sentiment_negative,
        }

        df = generate_dataset(
            n_records=n_records,
            airlines=airline_list,
            sentiment_dist=dist,
            topics=topic_list,
            start_date=start_date,
            end_date=end_date,
        )

        csv_bytes = dataframe_to_csv_bytes(df)
        filename = f"aerosent_dataset_{n_records}rows.csv"
        return StreamingResponse(
            BytesIO(csv_bytes),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Dataset generation failed")
        raise HTTPException(status_code=500, detail="Dataset generation failed")


@app.post("/dataset/generate-and-load")
def dataset_generate_and_load(request: GenerateAndLoadRequest):
    """Generate a synthetic dataset in-memory and immediately run the ETL pipeline."""
    try:
        dist = {
            "positive": request.sentiment_positive,
            "neutral": request.sentiment_neutral,
            "negative": request.sentiment_negative,
        }

        df = generate_dataset(
            n_records=request.n_records,
            airlines=request.airlines,
            sentiment_dist=dist,
            topics=request.topics,
            start_date=request.start_date,
            end_date=request.end_date,
        )

        required_cols = ['tweet_id', 'text', 'airline', 'airline_sentiment',
                         'airline_sentiment_confidence', 'negativereason', 'tweet_created']
        df = df[required_cols].dropna(subset=['text', 'airline', 'tweet_created'])
        df['negativereason'] = df['negativereason'].fillna("Not Specified")

        with engine.begin() as conn:
            result = etl_insert(conn, df, use_model=False)

        return {
            "success": True,
            **result,
            "generated": request.n_records,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Generate-and-load failed")
        raise HTTPException(status_code=500, detail="Generate-and-load failed")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
