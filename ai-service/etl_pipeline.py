"""
ETL Pipeline - Twitter Airline Sentiment
=========================================
Fases:
  1. Carga del CSV de Kaggle
  2. Limpieza de texto (NLP)
  3. Predicción con BERTweet (o uso del label ya existente)
  4. Inserción en Neon PostgreSQL (modelo estrella)

Columnas usadas del CSV:
  tweet_id, text, airline, airline_sentiment,
  airline_sentiment_confidence, negativereason, tweet_created
"""

import os
import re
import pandas as pd
import emoji
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# ─── Carga variables de entorno (.env) ───────────────────────────────────────
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("❌ No se encontró DATABASE_URL en el archivo .env")

engine = create_engine(DATABASE_URL)

# ─── Carga del modelo BERTweet ────────────────────────────────────────────────
# Se usa para RE-PREDECIR el sentimiento sobre el texto limpio.
# Si quieres saltarte el modelo y usar el label del CSV directamente,
# cambia USE_BERTWEET = False (más rápido, pero menos preciso sobre texto limpio).
USE_BERTWEET = True

if USE_BERTWEET:
    from transformers import pipeline as hf_pipeline
    print("⏳ Cargando modelo BERTweet (primera vez tarda ~2 minutos)...")
    sentiment_model = hf_pipeline(
        "text-classification",
        model="cardiffnlp/twitter-roberta-base-sentiment-latest",
        max_length=128,
        truncation=True
    )
    print("✅ Modelo cargado.")

# Mapeo de labels del modelo a etiquetas legibles
from nlp_utils import LABEL_MAP, clean_tweet, get_or_create_dim, get_or_create_date


# ─── Pipeline principal ───────────────────────────────────────────────────────
def run_etl(csv_path: str):
    print(f"\n📂 Leyendo dataset: {csv_path}")
    df = pd.read_csv(csv_path)

    # Columnas que necesitamos
    cols = ['tweet_id', 'text', 'airline', 'airline_sentiment',
            'airline_sentiment_confidence', 'negativereason', 'tweet_created']
    df = df[cols].dropna(subset=['text', 'airline', 'tweet_created'])
    print(f"✅ {len(df)} tweets listos para procesar.")

    # Rellena negativereason vacío con "Not Specified"
    df['negativereason'] = df['negativereason'].fillna("Not Specified")

    inserted = 0
    skipped  = 0

    with engine.begin() as conn:
        for i, row in df.iterrows():
            # Progreso cada 500 tweets
            if i % 500 == 0:
                print(f"  → Procesando tweet {i}/{len(df)}...")

            # 1. Limpieza
            clean_text = clean_tweet(row['text'])
            if len(clean_text) < 5:
                skipped += 1
                continue

            # 2. Predicción de sentimiento
            if USE_BERTWEET:
                result    = sentiment_model(clean_text)[0]
                sentiment = LABEL_MAP.get(result['label'], result['label'])
                confidence = round(result['score'], 4)
            else:
                # Usa el label del CSV directamente (modo rápido)
                sentiment  = LABEL_MAP.get(row['airline_sentiment'], "Neutral")
                confidence = float(row['airline_sentiment_confidence']) \
                             if pd.notna(row['airline_sentiment_confidence']) else 0.0

            # 3. IDs de dimensiones
            date_id     = get_or_create_date(conn, row['tweet_created'])
            airline_id  = get_or_create_dim(conn, "DimAirline",  "airline_id",  "airline_name",  row['airline'])
            platform_id = get_or_create_dim(conn, "DimPlatform", "platform_id", "platform_name", "Twitter")
            topic_id    = get_or_create_dim(conn, "DimTopic",    "topic_id",    "topic_name",    row['negativereason'])

            # 4. Inserción en tabla de hechos
            conn.execute(text("""
                INSERT INTO FactSentimentAnalysis
                    (tweet_text, tweet_text_clean, sentiment, confidence,
                     date_id, airline_id, platform_id, topic_id)
                VALUES
                    (:raw, :clean, :sent, :conf, :did, :aid, :pid, :tid)
            """), {
                "raw":   row['text'],
                "clean": clean_text,
                "sent":  sentiment,
                "conf":  confidence,
                "did":   date_id,
                "aid":   airline_id,
                "pid":   platform_id,
                "tid":   topic_id
            })
            inserted += 1

    print(f"\n🎉 ETL completado.")
    print(f"   ✅ Insertados : {inserted} tweets")
    print(f"   ⚠️  Omitidos   : {skipped} tweets (texto vacío tras limpieza)")

# ─── Punto de entrada ─────────────────────────────────────────────────────────
if __name__ == "__main__":
    # Cambia la ruta si tu CSV está en otra ubicación
    CSV_PATH = "./data/Tweets.csv"
    run_etl(CSV_PATH)