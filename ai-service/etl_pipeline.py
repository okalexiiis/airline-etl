"""
ETL Pipeline — CLI entry point
================================
Loads a CSV and inserts tweets into the star-schema warehouse.
Uses the shared nlp_utils.etl_insert helper (same code path as the API).
The sentiment model used is cardiffnlp/twitter-roberta-base-sentiment-latest.
"""

import os
import logging
import pandas as pd
from sqlalchemy import create_engine
from dotenv import load_dotenv
from nlp_utils import etl_insert

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
)
logger = logging.getLogger('aerosent.etl')

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("No se encontro DATABASE_URL en el archivo .env")

engine = create_engine(DATABASE_URL)

# Set USE_MODEL = False to skip model re-inference and use the CSV labels directly.
USE_MODEL = True


def run_etl(csv_path: str):
    logger.info("Reading dataset: %s", csv_path)
    df = pd.read_csv(csv_path)

    cols = ['tweet_id', 'text', 'airline', 'airline_sentiment',
            'airline_sentiment_confidence', 'negativereason', 'tweet_created']
    df = df[cols].dropna(subset=['text', 'airline', 'tweet_created'])
    df['negativereason'] = df['negativereason'].fillna("Not Specified")

    logger.info("%d tweets ready to process", len(df))

    with engine.begin() as conn:
        result = etl_insert(conn, df, use_model=USE_MODEL)

    logger.info("ETL complete. Inserted: %d, Skipped: %d", result['inserted'], result['skipped'])


if __name__ == "__main__":
    CSV_PATH = "./data/Tweets.csv"
    run_etl(CSV_PATH)
