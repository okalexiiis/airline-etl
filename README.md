# AeroSent ✈️

AeroSent is a full-stack, AI-powered platform for analyzing airline sentiment from customer tweets. It features a dashboard for data visualization, a real-time NLP playground for text analysis, and a synthetic dataset generator/uploader.

The application utilizes a PostgreSQL star-schema data warehouse, an Express backend, and a Python FastAPI service leveraging the **RoBERTa** (cardiffnlp/twitter-roberta-base-sentiment-latest) model for sentiment prediction.

---

## 🏗️ Project Architecture

- **Frontend (`/frontend`)**: React, Vite, TypeScript, Chart.js, Lucide Icons. Interactive KPI cards, sentiment trends, topics/airlines breakdown, NLP playground.
- **Backend (`/backend`)**: Express (Node.js), TypeScript, node-postgres (`pg`). Handles API routing, authentication, database interactions, and AI service proxying.
- **AI Service (`/ai-service`)**: Python, FastAPI, HuggingFace Transformers, Pandas. Hosts the RoBERTa sentiment model and generates synthetic datasets. Dockerized.
- **Database**: PostgreSQL with a star schema: `FactSentimentAnalysis`, `DimAirline`, `DimPlatform`, `DimTopic`, `DimDate`.

---

## 🚀 Features

### Already Implemented
- **Authentication & Authorization**: better-auth with email/password sign-in. Role-based access (Viewer / Admin). Admin-only routes for ETL upload, dataset generation, and NLP analysis.
- **Dashboard**: KPIs, airline alerts, sentiment trends (line chart), sentiment distribution (donut), topic/airline sentiment breakdown (stacked bars), paginated tweet feed.
- **Explore**: Full tweet explorer with sentiment/topic filters. Context filters (airline + date range) shared with Dashboard view.
- **NLP Playground**: Real-time sentiment analysis of custom text with confidence scoring and history.
- **Dataset Manager**: Synthetic dataset generation (configurable records, airlines, topics, sentiment distribution) with CSV download or direct DB insertion. CSV upload with ETL pipeline.
- **AI Service**: Dockerized FastAPI service with batch inference, LRU-cached single-tweet analysis, health/readiness probes, API key auth.
- **Database Migrations**: Drizzle ORM schema definitions (TypeScript) with auto-generated SQL migrations. Star schema with indexes on FK columns and composite (date_id, sentiment).
- **Security**: Helmet security headers, rate limiting on admin endpoints, API key auth between backend and AI service, zod input validation, redacted structured logging.

### Planned (Roadmap)
- Docker Compose for full local orchestration
- CI/CD GitHub Actions pipeline
- Live social media ingestion
- Automated topic modeling (BERTopic / LDA)
- Named Entity Recognition (NER)
- PDF reporting dashboard exports
- Global full-text search in tweet content
- Materialized views + Redis caching at scale

---

## 🛠️ Getting Started

1. **Environment**: Copy `.env.example` to `.env` in both `backend/` and `ai-service/`. Set `DATABASE_URL` and matching `AI_API_KEY`.

2. **Database migrations**:
   ```bash
   cd backend
   pnpm install
   pnpm db:migrate
   pnpm db:seed
   ```

3. **AI Service** (Docker or local):
   ```bash
   cd ai-service
   docker build -t aerosent-ai .
   docker run -e DATABASE_URL=... -e AI_API_KEY=... -p 8000:8000 aerosent-ai
   # or: pip install -r requirements.txt && python main.py
   ```

4. **Backend**:
   ```bash
   cd backend
   pnpm run dev
   ```

5. **Frontend**:
   ```bash
   cd frontend
   pnpm install
   pnpm run dev
   ```
