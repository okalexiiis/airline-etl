import re
import emoji
import pandas as pd
from sqlalchemy import text

# Mapeo de labels del modelo a etiquetas legibles
LABEL_MAP = {
    "LABEL_0": "Negative",
    "LABEL_1": "Neutral",
    "LABEL_2": "Positive",
    # Por si el modelo devuelve directo el nombre
    "negative": "Negative",
    "neutral":  "Neutral",
    "positive": "Positive",
    "NEGATIVE": "Negative",
    "NEUTRAL":  "Neutral",
    "POSITIVE": "Positive",
}

def clean_tweet(text_str: str) -> str:
    """Limpia un tweet para procesamiento NLP."""
    if not isinstance(text_str, str):
        return ""
    text_str = re.sub(r'http\S+', '', text_str)                      # Quita URLs
    text_str = re.sub(r'@\w+', '', text_str)                          # Quita menciones
    text_str = re.sub(r'#(\w+)', r'\1', text_str)                     # Quita # pero deja la palabra
    text_str = emoji.demojize(text_str, delimiters=(" ", " "))        # Convierte emojis a texto
    text_str = re.sub(r'[^a-zA-Z0-9\s:_áéíóúüñÁÉÍÓÚÜÑ]', '', text_str)  # Quita chars especiales
    text_str = re.sub(r'\s+', ' ', text_str).strip()                  # Normaliza espacios
    return text_str.lower()

def get_or_create_dim(conn, table: str, id_col: str, name_col: str, value: str) -> int:
    """Busca un registro en una tabla dimensión; lo crea si no existe. Devuelve el ID."""
    row = conn.execute(
        text(f"SELECT {id_col} FROM {table} WHERE {name_col} = :val"),
        {"val": value}
    ).fetchone()
    if row:
        return row[0]
    row = conn.execute(
        text(f"INSERT INTO {table} ({name_col}) VALUES (:val) RETURNING {id_col}"),
        {"val": value}
    ).fetchone()
    return row[0]

def get_or_create_date(conn, date_str: str) -> int:
    """Inserta o recupera una fecha en DimDate. Devuelve el date_id."""
    dt = pd.to_datetime(date_str, utc=True)
    row = conn.execute(
        text("SELECT date_id FROM DimDate WHERE full_date = :d"),
        {"d": dt.date()}
    ).fetchone()
    if row:
        return row[0]
    row = conn.execute(
        text("""
            INSERT INTO DimDate (full_date, day, month, year, day_of_week)
            VALUES (:d, :day, :month, :year, :dow)
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
