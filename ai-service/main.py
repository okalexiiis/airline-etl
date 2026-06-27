import os
import shutil
import tempfile
import pandas as pd
from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional, List
from io import BytesIO
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Import utilities from shared file
from nlp_utils import LABEL_MAP, clean_tweet, get_or_create_dim, get_or_create_date

# Import the new dataset generator
from dataset_generator import generate_dataset, dataframe_to_csv_bytes

# Load environment variables
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("❌ No se encontró DATABASE_URL en el archivo .env")

# Initialize DB Engine
engine = create_engine(DATABASE_URL)

# Load BERTweet model once at startup
from transformers import pipeline as hf_pipeline
print("⏳ Cargando modelo BERTweet...")
sentiment_model = hf_pipeline(
    "text-classification",
    model="cardiffnlp/twitter-roberta-base-sentiment-latest",
    max_length=128,
    truncation=True
)
print("✅ Modelo cargado.")

app = FastAPI(title="AeroSent NLP API", description="NLP Sentiment Analysis service for AeroSent")


# ─── Pydantic Models ──────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=560, description="The tweet or feedback text to analyze")
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
async def analyze_text(request: AnalyzeRequest):
    try:
        clean_txt = clean_tweet(request.text)
        if not clean_txt:
            raise HTTPException(status_code=400, detail="Text is empty or invalid after cleaning")

        result = sentiment_model(clean_txt)[0]
        sentiment = LABEL_MAP.get(result['label'], result['label'])
        confidence = round(result['score'], 4)

        return AnalyzeResponse(
            cleaned_text=clean_txt,
            sentiment=sentiment,
            confidence=confidence
        )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")


# ─── ETL Upload ───────────────────────────────────────────────────────────────

@app.post("/etl/run")
async def run_etl_upload(file: UploadFile = File(...)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")

    temp_dir = tempfile.gettempdir()
    temp_file_path = os.path.join(temp_dir, f"upload_{file.filename}")

    try:
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        df = pd.read_csv(temp_file_path)

        required_cols = ['tweet_id', 'text', 'airline', 'airline_sentiment',
                         'airline_sentiment_confidence', 'negativereason', 'tweet_created']
        missing_cols = [col for col in required_cols if col not in df.columns]
        if missing_cols:
            raise HTTPException(status_code=400, detail=f"CSV is missing required columns: {missing_cols}")

        df = df[required_cols].dropna(subset=['text', 'airline', 'tweet_created'])
        df['negativereason'] = df['negativereason'].fillna("Not Specified")

        inserted = 0
        skipped = 0

        with engine.begin() as conn:
            for _, row in df.iterrows():
                clean_txt = clean_tweet(row['text'])
                if len(clean_txt) < 5:
                    skipped += 1
                    continue

                result = sentiment_model(clean_txt)[0]
                sentiment = LABEL_MAP.get(result['label'], result['label'])
                confidence = round(result['score'], 4)

                date_id = get_or_create_date(conn, row['tweet_created'])
                airline_id = get_or_create_dim(conn, "DimAirline", "airline_id", "airline_name", row['airline'])
                platform_id = get_or_create_dim(conn, "DimPlatform", "platform_id", "platform_name", "Twitter")
                topic_id = get_or_create_dim(conn, "DimTopic", "topic_id", "topic_name", row['negativereason'])

                conn.execute(text("""
                    INSERT INTO FactSentimentAnalysis
                        (tweet_text, tweet_text_clean, sentiment, confidence,
                         date_id, airline_id, platform_id, topic_id)
                    VALUES
                        (:raw, :clean, :sent, :conf, :did, :aid, :pid, :tid)
                """), {
                    "raw": row['text'],
                    "clean": clean_txt,
                    "sent": sentiment,
                    "conf": confidence,
                    "did": date_id,
                    "aid": airline_id,
                    "pid": platform_id,
                    "tid": topic_id
                })
                inserted += 1

        return {"success": True, "inserted": inserted, "skipped": skipped}

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"ETL execution failed: {str(e)}")
    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)


# ─── Dataset Generator ────────────────────────────────────────────────────────

@app.get("/dataset/generate")
async def dataset_generate(
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
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Dataset generation failed: {str(e)}")


@app.post("/dataset/generate-and-load")
async def dataset_generate_and_load(request: GenerateAndLoadRequest):
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

        inserted = 0
        skipped = 0

        with engine.begin() as conn:
            for _, row in df.iterrows():
                clean_txt = clean_tweet(row['text'])
                if len(clean_txt) < 5:
                    skipped += 1
                    continue

                # Use the generator's label directly — no model re-inference needed
                sentiment = row['airline_sentiment'].capitalize()
                confidence = float(row['airline_sentiment_confidence'])

                date_id = get_or_create_date(conn, row['tweet_created'])
                airline_id = get_or_create_dim(conn, "DimAirline", "airline_id", "airline_name", row['airline'])
                platform_id = get_or_create_dim(conn, "DimPlatform", "platform_id", "platform_name", "Twitter")
                topic_id = get_or_create_dim(conn, "DimTopic", "topic_id", "topic_name", row['negativereason'])

                conn.execute(text("""
                    INSERT INTO FactSentimentAnalysis
                        (tweet_text, tweet_text_clean, sentiment, confidence,
                         date_id, airline_id, platform_id, topic_id)
                    VALUES
                        (:raw, :clean, :sent, :conf, :did, :aid, :pid, :tid)
                """), {
                    "raw": row['text'],
                    "clean": clean_txt,
                    "sent": sentiment,
                    "conf": confidence,
                    "did": date_id,
                    "aid": airline_id,
                    "pid": platform_id,
                    "tid": topic_id,
                })
                inserted += 1

        return {
            "success": True,
            "inserted": inserted,
            "skipped": skipped,
            "generated": request.n_records,
        }

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Generate-and-load failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
