# AeroSent ✈️

AeroSent is a full-stack, AI-powered platform for analyzing airline sentiment from customer tweets. It features a modern, premium dashboard for data visualization, a real-time NLP playground for text analysis, and a comprehensive synthetic dataset generator/uploader. 

The application utilizes a PostgreSQL star-schema data warehouse, an Express backend, and a Python FastAPI service leveraging the **BERTweet (RoBERTa)** machine learning model for high-accuracy sentiment prediction.

---

## 🏗️ Project Architecture

- **Frontend (`/frontend`)**: React, Vite, TypeScript, Chart.js, Lucide Icons. Features a modern glassmorphism UI, interactive KPI cards, sentiment trends, and an NLP playground.
- **Backend (`/backend`)**: Express (Node.js), TypeScript, node-postgres (`pg`). Handles API routing, database interactions, and ETL proxying.
- **AI Service (`/ai-service`)**: Python, FastAPI, HuggingFace Transformers, Pandas. Hosts the `cardiffnlp/twitter-roberta-base-sentiment-latest` model and generates synthetic datasets.
- **Database**: PostgreSQL configured with a robust star schema (`FactTweets`, `DimAirlines`, `DimPlatforms`, `DimTopics`, `DimDates`).

---

## 🚀 Features That Should Be Added (Roadmap)

To elevate AeroSent from an impressive prototype to an enterprise-grade SaaS application, the following features should be implemented:

### 1. Authentication, Authorization & User Management 🔐
- **Current State**: The dashboard and data generation tools are open to anyone with the URL.
- **Proposed Feature**: Implement JWT-based authentication (e.g., using Passport.js or a provider like Auth0/Firebase). Add role-based access control (RBAC) so that `Admins` can upload datasets and configure the NLP model, while `Viewers` can only see the dashboard.

### 2. Live Social Media Ingestion (Real-Time Streams) 📡
- **Current State**: Data is ingested via batch CSV uploads or synthetic generation.
- **Proposed Feature**: Connect to the X (Twitter) API v2 or other social listening APIs via WebSockets. Ingest live customer feedback, run it through the FastAPI BERTweet model in real-time, and update the frontend dashboard live via Socket.io without requiring manual page refreshes.

### 3. Automated Topic Modeling & Unsupervised Discovery 🧠
- **Current State**: Topics (e.g., "Late Flight", "Lost Luggage") are currently predefined and mapped using keywords or static categories.
- **Proposed Feature**: Implement an unsupervised NLP algorithm like **BERTopic** or **LDA** in the Python service. This would allow the system to automatically discover *new*, emerging complaint trends without human intervention, creating dynamic dimensions in the star schema.

### 4. Advanced Entity Recognition (NER) 🏷️
- **Current State**: The model only extracts sentiment (Positive, Neutral, Negative).
- **Proposed Feature**: Use a Named Entity Recognition (NER) model to automatically extract specific flight numbers, airport codes (e.g., LAX, JFK), and employee names from the tweet text. Store these in a new `DimEntities` table to see which specific flights or airports cause the most negative sentiment.

### 5. Dockerization & CI/CD Pipelines 🐳
- **Current State**: Services must be started individually (`pnpm run dev` in multiple folders and `python main.py`).
- **Proposed Feature**: Add a `docker-compose.yml` file to spin up the Postgres DB, Express API, FastAPI service, and React frontend with a single command. Implement GitHub Actions to run ESLint, PyTest, and Jest automatically on every commit.

### 6. Data Export & PDF Reporting 📊
- **Current State**: Users can view the dashboard and download synthetic CSVs, but cannot export analytics.
- **Proposed Feature**: Add a "Generate Report" button to the frontend that captures the current dashboard filters and charts, converting them into a clean, downloadable PDF report (using libraries like `jsPDF` or a headless browser service) for executive summaries.

### 7. Global Search & Advanced Filtering 🔍
- **Current State**: Filtering is limited to dropdowns for airline, topic, sentiment, and date ranges.
- **Proposed Feature**: Add a global full-text search bar that allows users to search the raw text of the tweets (e.g., "coffee spill" or "rude attendant"). Implement this using PostgreSQL Full-Text Search (TSVECTOR) or by integrating Elasticsearch/Meilisearch.

### 8. Performance Optimization & Caching ⚡
- **Current State**: Database queries calculate KPIs and trends on the fly.
- **Proposed Feature**: As the dataset scales to millions of tweets, implement **Materialized Views** in PostgreSQL to pre-aggregate daily KPIs. Add a **Redis** caching layer in the Express backend to serve dashboard analytics instantly.

### 9. System Health & Job Monitoring Dashboard 📈
- **Current State**: If the ETL pipeline fails on a huge file, users rely on a UI error banner.
- **Proposed Feature**: Add an admin dashboard to monitor the health of the FastAPI Python server, track memory usage of the BERTweet model, and view background job queues (using BullMQ) for processing massive CSV datasets asynchronously.

---

## 🛠️ Getting Started

To run the project locally (currently requires manual startup):

1. **Start the Database**: Ensure PostgreSQL is running and credentials match your `.env` file.
2. **Start the FastAPI Service**:
   ```bash
   cd ai-service
   pip install -r requirements.txt
   python main.py or uvicorn main:app --port 8000
   ```
3. **Start the Express Backend**:
   ```bash
   cd backend
   pnpm install
   pnpm run dev
   ```
4. **Start the React Frontend**:
   ```bash
   cd frontend
   pnpm install
   pnpm run dev
   ```
