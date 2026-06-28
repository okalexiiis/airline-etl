"""
Dataset Generator — AeroSent
================================
Generates synthetic airline-tweet CSV datasets using a curated template bank.
The output schema exactly matches Tweets.csv so it can be fed directly into
the existing ETL pipeline.

Required columns:
  tweet_id, airline_sentiment, airline_sentiment_confidence,
  negativereason, negativereason_confidence, airline,
  airline_sentiment_gold, name, negativereason_gold,
  retweet_count, text, tweet_coord, tweet_created,
  tweet_location, user_timezone
"""

import random
import uuid
import pandas as pd
from datetime import datetime, timedelta
from typing import Optional
from io import StringIO

# ─── Constants ────────────────────────────────────────────────────────────────

AIRLINES = ["Virgin America", "United", "Southwest", "Delta", "US Airways", "American"]

TOPICS = [
    "Late Flight",
    "Customer Service Issue",
    "Cancelled Flight",
    "Lost Luggage",
    "Bad Flight",
    "Flight Booking Problems",
    "Flight Attendant Complaints",
    "Damaged Luggage",
    "longlines",
    "Can't Tell",
]

TIMEZONES = [
    "Eastern Time (US & Canada)",
    "Pacific Time (US & Canada)",
    "Central Time (US & Canada)",
    "Mountain Time (US & Canada)",
    "London",
    "Berlin",
    "Sydney",
]

LOCATIONS = [
    "New York, NY", "Los Angeles, CA", "Chicago, IL", "Houston, TX",
    "Dallas, TX", "Miami, FL", "Atlanta, GA", "Seattle, WA",
    "San Francisco, CA", "Boston, MA", "Denver, CO", "Phoenix, AZ",
    "", "", "",  # Some tweets have no location
]

NAMES = [
    "jsmith", "mrodriguez", "lchen", "kwilliams", "sarahjones",
    "miketyson", "flyerguy", "frequentflyer", "angrytraveler", "happyflyer",
    "traveladdict", "aviationgeek", "luxurytravel", "budgetflyer", "jetsetlife",
]

# ─── Tweet Templates by Sentiment & Topic ────────────────────────────────────

POSITIVE_TEMPLATES = [
    "@{airline} Amazing flight experience today! The crew was incredibly professional and attentive.",
    "@{airline} Just landed and I have to say, best airline experience I've had in years. Thank you!",
    "@{airline} Your customer service team went above and beyond today. Really impressed!",
    "@{airline} Smooth boarding, friendly staff, and we landed early. What more could you ask for?",
    "@{airline} The seats were comfortable and the entertainment was great on my {route} flight.",
    "@{airline} Just upgraded me for free! This is why I keep flying with you. #loyal",
    "@{airline} Flight was on time, crew was fantastic. Keep up the great work!",
    "@{airline} Shoutout to your ground crew at {city} airport - super efficient and friendly.",
    "@{airline} Thank you for a wonderful flight. The food was actually surprisingly good!",
    "@{airline} 5 stars for the whole experience today. Will definitely book again!",
    "@{airline} Pleasantly surprised by the new seat design on this aircraft. Very comfortable!",
    "@{airline} Arrived 20 minutes early! Couldn't be happier with this flight.",
        "@{airline} Excellent service from check-in to landing. Couldn't ask for more.",
    "@{airline} Thanks for making my business trip stress-free today.",
    "@{airline} Really appreciate how helpful the crew was during boarding.",
    "@{airline} Fast baggage delivery and an on-time arrival. Great job!",
    "@{airline} The pilot kept everyone informed throughout the flight. Very professional.",
    "@{airline} Cabin crew made the whole experience enjoyable. Thank you!",
    "@{airline} Pleasant flight from {city} to {city2}. Would definitely fly again.",
    "@{airline} Impressed by how organized boarding was today.",
    "@{airline} Everything ran smoothly from start to finish. Great experience!",
    "@{airline} Thanks for getting me home safely and right on schedule.",
]

NEUTRAL_TEMPLATES = [
    "@{airline} Flight was fine, nothing special but nothing to complain about either.",
    "@{airline} Average experience overall. Got from A to B, which is what matters I guess.",
    "@{airline} The flight was okay. Seats a bit cramped but the crew was pleasant enough.",
    "@{airline} Delayed by 30 minutes but made up time in the air. Not bad.",
    "@{airline} Decent experience. Could improve the boarding process though.",
    "@{airline} Flight okay but the WiFi was spotty. Managed to get some work done eventually.",
    "@{airline} Standard flight, no issues. Just another Tuesday in the air.",
    "@{airline} Nothing went wrong but nothing wowed me either. Exactly what I expected.",
    "@{airline} Meh. Neither the best nor the worst flight I've taken this month.",
    "@{airline} The aircraft was a bit old but the crew made up for it with good service.",
    "@{airline} Landed safely which is always the goal. Everything else was just average.",
    "@{airline} The gate change was annoying but the flight itself was fine.",
        "@{airline} Flight departed a little late but arrived close to schedule.",
    "@{airline} Pretty standard flight today. Nothing unusual happened.",
    "@{airline} Service was acceptable. Food could have been better.",
    "@{airline} Seats were average. Crew was polite enough.",
    "@{airline} Boarding took a while but everything else was fine.",
    "@{airline} Not much to report. Just another routine flight.",
    "@{airline} Flight met expectations overall.",
    "@{airline} Had worse flights, had better ones too.",
    "@{airline} Cabin was clean and reasonably comfortable.",
    "@{airline} Overall an uneventful trip, which is probably a good thing.",
]

NEGATIVE_TEMPLATES = {
    "Late Flight": [
        "@{airline} We've been sitting on the tarmac for 2 hours now with no explanation. Unacceptable!",
        "@{airline} My flight is now {delay}+ hours late and nobody at the gate can tell me why.",
        "@{airline} Another day, another massive delay with {airline}. This is the third time this month.",
        "@{airline} Missed my connecting flight because your plane was {delay} hours late. Thanks for nothing.",    "@{airline} Delayed again. Starting to think being on time isn't part of your business model.",
    "@{airline} Another delay with zero communication from the gate staff.",
    "@{airline} Three hours late and still no departure time announced.",
    "@{airline} Delayed because of 'operational issues' yet nobody explains what that means.",
    "@{airline} Watching every other airline leave while we're still waiting.",
    
    
        "@{airline} Still waiting at {city} airport. Flight was supposed to leave 3 hours ago.",
    ],
    "Customer Service Issue": [
        "@{airline} Your customer service rep just hung up on me after being on hold for 45 minutes!",
        "@{airline} Tried to rebook my flight and was told nothing could be done. Terrible service!",
        "@{airline} Your agents at {city} airport were incredibly rude and unhelpful today.",
        "@{airline} On hold for over an hour and still no resolution. This is ridiculous.",    "@{airline} Every representative gave me a different answer. Nobody seems to know what's going on.",
    "@{airline} Customer support transferred me four times without solving anything.",
    "@{airline} Extremely disappointing customer service experience today.",
    "@{airline} Nobody answered my emails or calls regarding my booking.",
    "@{airline} I've never seen support this unorganized before.",
        "@{airline} Your customer service is a joke. Nobody takes responsibility for anything.",
    ],
    "Cancelled Flight": [
        "@{airline} My flight was just cancelled with no rebooking options offered. What am I supposed to do?",
        "@{airline} Flight cancelled 30 minutes before boarding. Now stranded at {city} airport.",
        "@{airline} Third cancellation this week! I've had it with {airline}.",
        "@{airline} Cancelled again! No voucher, no apology, no alternative. Disgraceful.",
        "@{airline} Flight cancelled and the next available seat is in 2 days. Absolutely unacceptable.",    "@{airline} Woke up to a cancellation text with no replacement flight.",
    "@{airline} Cancelled flight ruined my vacation plans.",
    "@{airline} No hotel, no compensation, no information after the cancellation.",
    "@{airline} Entire day wasted because my flight was cancelled.",
    "@{airline} Why was my flight cancelled while others are still departing?",
    ],
    "Lost Luggage": [
        "@{airline} My luggage has been missing for 3 days now. Nobody can tell me where it is.",
        "@{airline} Landed in {city} but my bags are apparently still in {city2}. Nightmare.",
        "@{airline} Lost my luggage AGAIN. This is the second time in 6 months with {airline}.",
        "@{airline} Still waiting for my bags 4 hours after landing. Your baggage claim process is broken.",
        "@{airline} Filed a lost luggage claim with {airline} and haven't heard back in a week.",    "@{airline} My luggage tracker hasn't updated in days.",
    "@{airline} Vacation started without my suitcase. Thanks a lot.",
    "@{airline} Still wearing the same clothes because my bags never arrived.",
    "@{airline} Nobody can tell me where my luggage actually is.",
    "@{airline} Lost baggage desk wasn't helpful at all.",
    ],
    "Bad Flight": [
        "@{airline} The cabin smelled terrible, seats were broken, and the bathroom was out of order.",
        "@{airline} Worst in-flight experience ever. Noisy, cramped, and the air conditioning was broken.",
        "@{airline} The aircraft looks like it hasn't been cleaned in weeks. Disgusting.",
        "@{airline} Turbulence was expected but the crew's total lack of communication was not.",
        "@{airline} Seat wouldn't recline, overhead bin was full, and the neighbor was loud. Great flight.",    "@{airline} Cabin was freezing the entire flight.",
    "@{airline} Seats were dirty and clearly hadn't been cleaned.",
    "@{airline} Loud cabin, uncomfortable seats, terrible experience overall.",
    "@{airline} Entertainment system didn't work for the whole flight.",
    "@{airline} Definitely one of the least comfortable flights I've taken.",
    ],
    "Flight Booking Problems": [
        "@{airline} Your website charged me twice and now I can't get a refund. This is fraud!",
        "@{airline} Tried to book online for 2 hours and kept getting errors. Called and they couldn't help either.",
        "@{airline} Booked a direct flight but you changed it to a connection without telling me.",
        "@{airline} Your app crashed and now I have a booking but no confirmation number.",
        "@{airline} The price I was quoted online was completely different at checkout. Bait and switch!",
    ],
    "Flight Attendant Complaints": [
        "@{airline} Your flight attendant was incredibly rude to a passenger asking for water. Unacceptable.",
        "@{airline} The crew on this flight was dismissive and unhelpful the entire trip.",
        "@{airline} A flight attendant literally rolled their eyes at me when I asked about my meal. Wow.",
        "@{airline} Your crew seemed completely disinterested. Barely acknowledged passengers.",
        "@{airline} Was snapped at by a flight attendant for asking a simple question. Really upset.",
    ],
    "Damaged Luggage": [
        "@{airline} My suitcase arrived completely destroyed. Wheel ripped off and zipper broken.",
        "@{airline} Luggage came out on the belt with a huge crack down the side. What did you do to it?",
        "@{airline} Filed a damaged baggage claim with {airline}. My expensive camera equipment was inside.",
        "@{airline} My bag looks like it was run over by a truck. Thanks {airline}.",
        "@{airline} Brand new luggage, first trip with {airline}, arrived completely trashed.",
    ],
    "longlines": [
        "@{airline} The lines at check-in are insane. Been waiting for over an hour and it's barely moving.",
        "@{airline} Security line at {city} is 90 minutes long. Going to miss my flight thanks to this.",
        "@{airline} Every single time I fly {airline} the boarding process is a chaotic mess.",
        "@{airline} Gate lines are completely disorganized. No zones being called, everyone just piles in.",
        "@{airline} Why does {airline} make boarding feel like a school cafeteria stampede every single time?",
    ],
    "Can't Tell": [
        "@{airline} Something weird happened on my flight today. Not sure how to feel about it.",
        "@{airline} Flight was... different. I'll leave it at that.",
        "@{airline} Had an interesting experience today with {airline}.",
    ],
}

# ─── Helper variables ─────────────────────────────────────────────────────────

CITIES = ["JFK", "LAX", "ORD", "DFW", "MIA", "ATL", "SEA", "SFO", "BOS", "DEN", "PHX", "LAS"]
ROUTES = ["JFK-LAX", "ORD-DFW", "ATL-MIA", "SEA-SFO", "BOS-DEN", "PHX-ORD"]
DELAYS = ["2", "3", "4", "5", "6"]

# ─── Generator function ───────────────────────────────────────────────────────

def _fill_template(template: str, airline: str) -> str:
    """Fill placeholders in a tweet template."""
    return (
        template
        .replace("{airline}", airline)
        .replace("{city}", random.choice(CITIES))
        .replace("{city2}", random.choice(CITIES))
        .replace("{route}", random.choice(ROUTES))
        .replace("{delay}", random.choice(DELAYS))
    )


def _random_date(start: datetime, end: datetime) -> datetime:
    delta = end - start
    return start + timedelta(seconds=random.randint(0, int(delta.total_seconds())))


def _format_tweet_date(dt: datetime) -> str:
    offset_hours = random.choice([-8, -7, -6, -5, -4])
    sign = "+" if offset_hours >= 0 else "-"
    return dt.strftime(f"%Y-%m-%d %H:%M:%S {sign}{abs(offset_hours):04d}")


def generate_dataset(
    n_records: int = 100,
    airlines: Optional[list] = None,
    sentiment_dist: Optional[dict] = None,
    topics: Optional[list] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> pd.DataFrame:
    """
    Generate a synthetic tweet dataset.

    Args:
        n_records: Total number of tweets to generate.
        airlines: List of airline names to include. Defaults to all 6.
        sentiment_dist: Dict with keys 'positive','neutral','negative' summing to 100.
        topics: List of negative topics to distribute among negative tweets.
        start_date: ISO date string for the earliest tweet (YYYY-MM-DD).
        end_date: ISO date string for the latest tweet (YYYY-MM-DD).

    Returns:
        pandas DataFrame with the Tweets.csv schema.
    """
    if airlines is None or len(airlines) == 0:
        airlines = AIRLINES
    if sentiment_dist is None:
        sentiment_dist = {"positive": 20, "neutral": 20, "negative": 60}
    if topics is None or len(topics) == 0:
        topics = TOPICS

    # Validate distribution
    total = sum(sentiment_dist.values())
    if total == 0:
        raise ValueError("Sentiment distribution must have at least one non-zero value")

    neg_pct = sentiment_dist.get("negative", 60) / total
    neu_pct = sentiment_dist.get("neutral", 20) / total
    pos_pct = sentiment_dist.get("positive", 20) / total

    n_neg = round(n_records * neg_pct)
    n_neu = round(n_records * neu_pct)
    n_pos = n_records - n_neg - n_neu  # remainder goes to positive

    # Date range
    dt_start = datetime.fromisoformat(start_date) if start_date else datetime(2015, 2, 16)
    dt_end = datetime.fromisoformat(end_date) if end_date else datetime(2015, 2, 24)
    if dt_end <= dt_start:
        dt_end = dt_start + timedelta(days=1)

    used_ids = set()
    def _unique_id() -> int:
        while True:
            tid = random.randint(560_000_000_000_000_000, 580_000_000_000_000_000)
            if tid not in used_ids:
                used_ids.add(tid)
                return tid

    avail_topics = [t for t in topics if t in NEGATIVE_TEMPLATES]
    if not avail_topics:
        avail_topics = list(NEGATIVE_TEMPLATES.keys())

    # -------------------------------------------------------------
    # Step 1: Generate all rows with placeholder confidences.
    #         Collect all generated texts for batch inference.
    # -------------------------------------------------------------
    rows: list[dict] = []
    generated_texts: list[str] = []

    # Negative tweets
    for _ in range(n_neg):
        airline = random.choice(airlines)
        topic = random.choice(avail_topics)
        template = random.choice(NEGATIVE_TEMPLATES[topic])
        text = _fill_template(template, airline)
        dt = _random_date(dt_start, dt_end)
        generated_texts.append(text)
        rows.append({
            "tweet_id": _unique_id(),
            "airline_sentiment": "negative",
            "airline_sentiment_confidence": 0.0,    # placeholder
            "negativereason": topic,
            "negativereason_confidence": 0.0,        # placeholder
            "airline": airline,
            "airline_sentiment_gold": "",
            "name": random.choice(NAMES),
            "negativereason_gold": "",
            "retweet_count": random.choice([0, 0, 0, 1, 2, 5]),
            "text": text,
            "tweet_coord": "",
            "tweet_created": _format_tweet_date(dt),
            "tweet_location": random.choice(LOCATIONS),
            "user_timezone": random.choice(TIMEZONES),
        })

    # Neutral tweets
    for _ in range(n_neu):
        airline = random.choice(airlines)
        template = random.choice(NEUTRAL_TEMPLATES)
        text = _fill_template(template, airline)
        dt = _random_date(dt_start, dt_end)
        generated_texts.append(text)
        rows.append({
            "tweet_id": _unique_id(),
            "airline_sentiment": "neutral",
            "airline_sentiment_confidence": 0.0,    # placeholder
            "negativereason": "",
            "negativereason_confidence": "",         # empty for non-negative
            "airline": airline,
            "airline_sentiment_gold": "",
            "name": random.choice(NAMES),
            "negativereason_gold": "",
            "retweet_count": random.choice([0, 0, 1]),
            "text": text,
            "tweet_coord": "",
            "tweet_created": _format_tweet_date(dt),
            "tweet_location": random.choice(LOCATIONS),
            "user_timezone": random.choice(TIMEZONES),
        })

    # Positive tweets
    for _ in range(n_pos):
        airline = random.choice(airlines)
        template = random.choice(POSITIVE_TEMPLATES)
        text = _fill_template(template, airline)
        dt = _random_date(dt_start, dt_end)
        generated_texts.append(text)
        rows.append({
            "tweet_id": _unique_id(),
            "airline_sentiment": "positive",
            "airline_sentiment_confidence": 0.0,    # placeholder
            "negativereason": "",
            "negativereason_confidence": "",         # empty for non-negative
            "airline": airline,
            "airline_sentiment_gold": "",
            "name": random.choice(NAMES),
            "negativereason_gold": "",
            "retweet_count": random.choice([0, 0, 0, 1, 3]),
            "text": text,
            "tweet_coord": "",
            "tweet_created": _format_tweet_date(dt),
            "tweet_location": random.choice(LOCATIONS),
            "user_timezone": random.choice(TIMEZONES),
        })

    # -------------------------------------------------------------
    # Step 2: Batch inference — one model call instead of N
    # -------------------------------------------------------------
    if generated_texts:
        from nlp_utils import batch_predict
        predictions = batch_predict(generated_texts, batch_size=32)
        for row, (_, confidence) in zip(rows, predictions):
            row["airline_sentiment_confidence"] = confidence
            # For negative tweets, also fill negativereason_confidence
            if row["airline_sentiment"] == "negative":
                row["negativereason_confidence"] = confidence

    # Shuffle and return
    df = pd.DataFrame(rows)
    df = df.sample(frac=1).reset_index(drop=True)
    return df


def dataframe_to_csv_bytes(df: pd.DataFrame) -> bytes:
    """Serialize a DataFrame to CSV bytes."""
    buf = StringIO()
    df.to_csv(buf, index=False)
    return buf.getvalue().encode("utf-8")