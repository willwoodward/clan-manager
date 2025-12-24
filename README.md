# Clan Manager - Clash of Clans Analytics Platform

A comprehensive analytics platform for Clash of Clans clans, featuring war data collection, player performance predictions, and live clan statistics.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      AWS Cloud (Optional)                │
│  ┌──────────────────────────────────────────────────┐  │
│  │  EC2: Data Collector → S3: War Data Storage     │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                  Backend API (FastAPI)                   │
│  • CoC API Proxy (live data)                            │
│  • Analytics API (predictions, statistics)               │
│  • S3/Local storage with automatic fallback             │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                  Frontend (React + Vite)                 │
│  • Clan dashboard                                        │
│  • Player performance predictions                        │
│  • War history and analytics                            │
└─────────────────────────────────────────────────────────┘
```

## Features

### Data Collection
- **Automated War Monitoring**: Continuously monitors for active wars using coc.py
- **Smart Scheduling**: Fetches war data 1 minute before war ends for accuracy
- **Flexible Storage**: Automatic S3/local storage fallback
- **Configurable Data**: Choose what to include (heroes, troops, spells)

### Analytics & Predictions
- **Player Performance Predictions**: Bayesian hierarchical model predicts expected stars and destruction %
- **Confidence Intervals**: 90% confidence bounds on predictions
- **Matchup Analysis**: Accounts for TH difference and hero levels
- **Historical Stats**: Track player performance over time

### Live Data
- **CoC API Proxy**: Access clan, player, and current war data
- **Auto-caching**: Redis caching for improved performance
- **CORS-safe**: No frontend CORS issues

## Project Structure

```
clan-manager/
├── backend/              # FastAPI backend service
│   ├── routers/
│   │   ├── coc.py       # CoC API proxy routes
│   │   └── analytics.py # Analytics & prediction routes
│   ├── services/
│   │   ├── coc_client.py    # CoC API client
│   │   └── predictor.py     # ML prediction service
│   ├── main.py
│   ├── config.py
│   └── Dockerfile
│
├── data-collector/       # War data collection service
│   ├── war_monitor.py   # Main monitoring service
│   ├── config.py
│   └── Dockerfile
│
├── shared/              # Shared utilities
│   ├── schemas/        # Pydantic models
│   │   ├── war.py
│   │   └── player.py
│   └── utils/
│       └── storage.py  # S3/local storage abstraction
│
├── frontend/            # React frontend
│   └── ...
│
├── docker-compose.yml
└── .env.example
```

## Quick Start

### 1. Prerequisites

- Python 3.11+
- Node.js 18+ (for frontend)
- Docker & Docker Compose (optional)
- Redis (optional, for caching)

### 2. Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required configuration:
```bash
# CoC API credentials
COC_API_KEY=your_api_key_here
COC_EMAIL=your_email@example.com
COC_PASSWORD=your_password

# Clan
CLAN_TAG=#29U8UJCU0

# Storage (uses local by default)
USE_S3=false
LOCAL_DATA_DIR=data
```

### 3. Development Setup

#### Option A: Docker Compose (Recommended)

```bash
# Start all services
docker-compose up

# Backend API: http://localhost:8000
# Frontend: http://localhost:5173
# API Docs: http://localhost:8000/api/docs
```

#### Option B: Manual Setup

**Install Python dependencies:**
```bash
# Backend
cd backend
pip install -r requirements.txt

# Data collector
cd ../data-collector
pip install -r requirements.txt
```

**Run services:**
```bash
# Terminal 1: Backend API
cd backend
uvicorn main:app --reload
# → http://localhost:8000

# Terminal 2: Data Collector (optional, for new war data)
cd data-collector
python war_monitor.py --debug

# Terminal 3: Frontend
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

## API Documentation

### CoC API Proxy Routes

**Base URL**: `http://localhost:8000/api/coc`

| Endpoint | Description |
|----------|-------------|
| `GET /clan/{tag}` | Get live clan data |
| `GET /clan/{tag}/members` | Get clan members |
| `GET /currentwar/{tag}` | Get current war status |
| `GET /player/{tag}` | Get player data |

### Analytics Routes

**Base URL**: `http://localhost:8000/api/analytics`

| Endpoint | Description |
|----------|-------------|
| `GET /predict/{player_tag}?defender_th=14&defender_heroes=90,90,65,50` | Predict player performance |
| `GET /stats/player/{player_tag}` | Get player statistics |
| `GET /wars/history?limit=20` | Get war history |
| `GET /priors` | Get TH-level statistics |
| `GET /storage/info` | Get storage backend info |

### Example: Predict Player Performance

```bash
curl "http://localhost:8000/api/analytics/predict/%23G92PL00CP?defender_th=14&defender_heroes=90,90,65,50"
```

Response:
```json
{
  "player_tag": "#G92PL00CP",
  "player_name": "JW2003",
  "player_th": 14,
  "expected_stars": 2.98,
  "expected_destruction": 99.1,
  "confidence_90_stars": [2.96, 3.0],
  "confidence_90_destruction": [98.0, 100.0],
  "sample_size": 2,
  "matchup_difficulty": 1.0,
  "reliability": "low"
}
```

## Storage Configuration

### Local Storage (Default)

Data is stored in `data/` directory:
```
data/
└── war_In_War_20251218_130735.json
```

### S3 Storage

Enable S3 in `.env`:
```bash
USE_S3=true
S3_BUCKET=clan-manager-wars
S3_PREFIX=wars
S3_REGION=us-east-1
```

S3 structure:
```
s3://clan-manager-wars/
└── wars/
    └── 2025/
        └── 12/
            └── 18/
                └── war_In_War_20251218_130735.json
```

The system **automatically falls back** to local storage if S3 is unavailable.

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## License

MIT License - see LICENSE file for details
