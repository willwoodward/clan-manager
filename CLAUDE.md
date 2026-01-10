# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ CRITICAL: Git Commit Policy

**NEVER commit or push code without explicit user permission.**

- Do NOT use `git commit` or `git push` unless the user specifically asks you to
- Do NOT proactively commit "fixes" or "improvements"
- Always ask the user first: "Would you like me to commit these changes?"
- The user may want to review changes before committing
- The user controls when code is committed and pushed to remote

If you accidentally commit without permission:
1. Immediately stop and apologize
2. Ask the user how they want to proceed (keep it, revert it, amend it, etc.)
3. Do NOT try to "fix" it by reverting without asking

## Project Overview

This is a full-stack Clash of Clans clan management platform featuring real-time analytics, war predictions, clan games tracking, and player performance monitoring.

**Tech Stack:**
- Backend: FastAPI + coc.py (Python 3.11+)
- Frontend: React 18 + TypeScript + Vite
- Data: JSON files (local) or S3, Redis caching
- UI: TailwindCSS + shadcn/ui
- State: Zustand + TanStack Query

## Development Commands

### Full Stack (Docker - Recommended)

```bash
# Start all services (backend:8000, frontend:5173, redis:6379)
docker-compose up

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Rebuild after dependencies change
docker-compose up --build

# Stop all services
docker-compose down
```

### Backend Development

```bash
# Install dependencies
cd backend
pip install -r requirements.txt

# Run development server (with auto-reload)
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000

# API documentation available at:
# http://localhost:8000/docs (Swagger UI)
# http://localhost:8000/redoc (ReDoc)
```

### Frontend Development

```bash
# Install dependencies
cd frontend
npm install

# Run development server (port 5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# Update league metadata (run after league data changes)
npm run update-leagues
```

### Utility Scripts

Located in `/scripts/`:

```bash
# Clan games management
python scripts/init_clan_games.py              # Manually start session
python scripts/sync_clan_games_session.py      # Add missing members
python scripts/fix_clan_games_start_points.py  # Fix incorrect baselines

# Data management
./scripts/backup.sh                            # Backup data directory
./scripts/download-remote-data.sh              # Sync from production server
./scripts/merge-data.sh                        # Merge data directories

# Testing
python scripts/add_sample_events.py            # Add test events to timeline
```

## Architecture Overview

### Three-Layer Architecture

```
┌─────────────────────────────────────────────────────┐
│  Frontend (React + Vite)                            │
│  • Client-side routing (React Router)               │
│  • TanStack Query for server state                  │
│  • Zustand for client state                         │
└────────────────────┬────────────────────────────────┘
                     │ HTTP/REST API
┌────────────────────▼────────────────────────────────┐
│  Backend (FastAPI)                                   │
│  • CoC API proxy (live data)                        │
│  • Analytics & predictions (ML service)             │
│  • Background event monitoring (coc.py events)      │
│  • Redis caching layer                              │
└────────────────────┬────────────────────────────────┘
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
┌─────────────────┐   ┌──────────────────┐
│ Local JSON      │   │ Clash of Clans   │
│ or S3 Storage   │   │ Official API     │
└─────────────────┘   └──────────────────┘
```

### Backend Structure

```
backend/
├── main.py                 # FastAPI app, startup event monitor
├── config.py              # Pydantic settings from env vars
├── routers/               # API endpoint groups
│   ├── coc.py            # Proxy to CoC API (clan, player, war)
│   ├── analytics.py      # War predictions & player stats
│   ├── clan_games.py     # Session management endpoints
│   ├── cwl_statistics.py # CWL tracking endpoints
│   ├── activity.py       # Player activity tracking
│   └── events.py         # Event timeline endpoints
└── services/             # Business logic layer
    ├── event_monitor.py  # **Core: Background event monitoring**
    ├── predictor.py      # **Core: ML predictions (Bayesian)**
    ├── coc_client.py     # Wrapper for shared CoC client
    └── war_strategy.py   # War attack optimization
```

### Shared Utilities Layer

```
shared/
├── schemas/              # Pydantic models shared across services
│   ├── war.py
│   └── player.py
└── utils/                # Shared business logic
    ├── storage.py        # **Core: Storage abstraction (local/S3)**
    ├── coc_client.py     # **Core: CoC API client wrapper**
    ├── clan_games_storage.py  # Clan games session persistence
    ├── activity_tracker.py    # Player activity tracking
    ├── event_logger.py        # Event timeline logging
    └── event_storage.py       # Event persistence
```

### Frontend Structure

```
frontend/src/
├── App.tsx               # Root component + React Router setup
├── pages/                # Route components (dashboard, wars, cwl, etc.)
├── components/
│   ├── ui/              # shadcn/ui primitives (button, card, dialog, etc.)
│   ├── layout/          # Layout components (sidebar, navbar)
│   └── [feature-components].tsx  # Reusable feature components
├── services/
│   ├── api.ts           # Axios API client with base config
│   └── clash-api.ts     # CoC-specific API methods
├── types/               # TypeScript type definitions
└── utils/               # Helper functions
```

## Critical Architecture Concepts

### 1. Event-Driven Data Collection

The **backend automatically monitors and collects data** via `event_monitor.py` (1398 lines). This runs as a background task on FastAPI startup and uses coc.py event decorators.

**Key Events Monitored:**
- **War state changes** (every 5 min): Detects war start/end, saves detailed war data when wars end
- **Clan games**: Auto-starts sessions when games begin, tracks points via achievement changes, auto-ends when complete
- **Donations**: Tracks donation/receive changes, logs to timeline
- **Member changes**: Tracks joins/leaves, updates roster

**Important:** There is no separate data collector service anymore. The previous `data-collector/` container was migrated into the backend in Dec 2024 (see `docs/data-collector-migration.md`).

### 2. Dual Storage System

Storage is abstracted in `shared/utils/storage.py` (660 lines):

- **Local mode** (default): JSON files in `/app/data/`
- **S3 mode**: AWS S3 bucket with automatic fallback to local
- Controlled by `USE_S3` environment variable
- Same file structure on both backends

**Data directory structure:**
```
data/
├── war_*.json              # Regular war files
├── cwl/
│   ├── seasons/            # CWL season summaries
│   └── wars/               # Individual CWL wars
├── clan_games/
│   ├── current_session.json
│   └── sessions.json
├── events/
│   └── clan_events.json
├── activity/
│   └── player_activity.json
└── [other feature data]
```

### 3. War Prediction System

`backend/services/predictor.py` (515 lines) implements **Bayesian hierarchical modeling** for war predictions:

**How it works:**
1. Loads all historical war data (regular + CWL wars)
2. Builds player attack history with TH levels, hero levels, stars, destruction
3. Computes TH-level priors (baseline performance by town hall)
4. For predictions: blends player history with TH prior based on sample size
5. Adjusts for matchup difficulty (TH difference + hero difference)
6. Returns expected stars/destruction with 90% confidence intervals

**Data sources:**
- Regular wars: `data/war_*.json` via `storage.list_wars()`
- CWL wars: `data/cwl/wars/*.json` via `storage.list_cwl_wars()`

**Note:** CWL war data lacks hero information (API limitation), so hero adjustments don't apply to CWL attacks.

### 4. Clan Games Auto-Session Management

Clan games sessions are **fully automated**:

1. **Auto-start**: Event monitor detects clan games start → creates session → snapshots all clan members
2. **Real-time tracking**: Monitors "Games Champion" achievement points for each member
3. **Auto-end**: When games complete → finalizes session → archives to history

**Manual controls** (via API endpoints):
- `POST /api/clan-games/session/start` - Force start
- `POST /api/clan-games/session/end` - Force end
- `POST /api/clan-games/session/sync` - Add missing members

### 5. Frontend Data Flow

```
User Interaction → React Component
    ↓
TanStack Query hook (checks cache, manages loading/error states)
    ↓
API service (axios with base URL from env)
    ↓
Backend router endpoint
    ↓
Service layer (business logic)
    ↓
CoC Client / Storage Manager
    ↓
External API / File System
    ↓
[Response flows back up, cache updated]
```

**State management:**
- **Server state**: TanStack Query (auto-refetching, caching, background updates)
- **Client state**: Zustand (theme, user preferences)
- **No global props drilling**: Query hooks accessed anywhere

## Environment Configuration

Required in `.env`:

```bash
# CoC API credentials (required)
COC_EMAIL=your-email@example.com
COC_PASSWORD=your-password
CLAN_TAG=#29U8UJCUO

# Storage (optional, defaults to local)
USE_S3=false
LOCAL_DATA_DIR=data

# Optional
REDIS_HOST=redis
REDIS_PORT=6379
CACHE_TTL=3600
CORS_ORIGINS=["http://localhost:5173"]
```

Frontend uses `VITE_API_URL` and `VITE_CLAN_TAG` (set in docker-compose.yml or .env.local).

## Common Development Patterns

### Adding a New API Endpoint

1. **Create/update router** in `backend/routers/`
2. **Add business logic** in `backend/services/` if complex
3. **Use shared utilities** from `shared/utils/` for storage/API calls
4. **Update frontend service** in `frontend/src/services/api.ts`
5. **Create TanStack Query hook** in component or custom hook file
6. **Use in component** with proper loading/error states

### Adding a New Feature to Event Monitor

1. **Edit `backend/services/event_monitor.py`**
2. **Use coc.py event decorators** (`@client.event`) or polling in existing checks
3. **Save data** via `storage_manager` methods
4. **Log events** via `event_logger.log_event()` for timeline
5. **Test** by triggering event manually or waiting for natural occurrence

### Working with Storage

```python
# Always use StorageManager from shared/utils/storage.py
from shared.utils.storage import StorageManager

storage = StorageManager(
    use_s3=settings.use_s3,
    s3_bucket=settings.s3_bucket,
    local_data_dir=settings.local_data_dir
)

# List wars
wars = await storage.list_wars(limit=100)

# Save war
await storage.save_war_data(war_data, war_id)

# List CWL wars
cwl_wars = await storage.list_cwl_wars(season_id="2025-01")

# Save CWL war
await storage.save_cwl_war(war_data, war_tag)
```

### Working with CoC API

```python
# Use shared CoC client (handles auth, rate limiting)
from shared.utils.coc_client import coc_client

# Get clan
clan = await coc_client.get_clan(clan_tag)

# Get player
player = await coc_client.get_player(player_tag)

# Get current war
war = await coc_client.get_current_war(clan_tag)

# Get CWL data
league_group = await coc_client.get_cwl_group(clan_tag)
cwl_war = await coc_client.get_cwl_war(war_tag)
```

## Deployment

**Frontend:** GitHub Pages
- Deployed via `.github/workflows/deploy-frontend.yml`
- Triggers on push to `main` with `frontend/**` changes
- Base path: `/clan-manager/`

**Backend:** DigitalOcean Droplet
- Deployed via `.github/workflows/deploy-backend.yml`
- Docker Compose with Caddy reverse proxy
- Production config: `docker-compose.prod.yml`
- Data persisted in `/var/clan-data` volume

See `docs/deployment-strategy.md` for detailed deployment guide.

## Key Files to Understand

**Backend:**
- `backend/services/event_monitor.py` (1398 lines) - Core event-driven data collection
- `backend/services/predictor.py` (515 lines) - War prediction ML model
- `shared/utils/storage.py` (660 lines) - Storage abstraction layer
- `shared/utils/coc_client.py` (608 lines) - CoC API client wrapper

**Frontend:**
- `frontend/src/App.tsx` - React Router setup, navigation structure
- `frontend/src/services/api.ts` - API client configuration
- `frontend/src/pages/clan-games.tsx` - Complex feature example with real-time updates

## Important Notes

### Data Migration (Dec 2024)
- **Old architecture**: Separate `data-collector` container running `war_monitor.py`
- **New architecture**: Unified backend with `event_monitor.py` running as background task
- **Reason**: Eliminated duplicate event monitoring, shared coc.py client for better rate limiting
- See: `docs/data-collector-migration.md`

### CWL Wars in Predictions
- CWL wars are now included in prediction history (added Jan 2026)
- CWL war data structure differs from regular wars (camelCase, nested attacks)
- Hero data not available in CWL wars (API limitation)
- See: `claude.md` development log for details

### Clan Games Sessions
- Sessions auto-start/end - manual intervention rarely needed
- If members are missing from session, use sync script
- Points tracked via "Games Champion" achievement
- Baseline snapshot taken at session start

### Redis Caching
- Backend caches CoC API responses to reduce API calls
- TTL controlled by `CACHE_TTL` env var (default 3600s)
- Cache automatically invalidated on event updates
- Optional dependency - backend works without Redis

## Known Issues

### CoC API Key Conflicts (Local + Production)

**Issue:** Both local development and production servers share the same CoC developer account credentials but have different IP addresses. When one server restarts and manages its API keys, it can invalidate the other server's keys, causing 403 Forbidden errors.

**Symptoms:**
- Event monitor logs show: `coc.errors.Forbidden: accessDenied (status code: 403): Invalid authorization`
- Activity tracking stops working
- Continuous "Ignoring exception in event task" errors

**Immediate Fix:**
```bash
# Restart the affected server to recreate API keys
ssh root@<SERVER_IP> "cd /opt/clan-manager && docker compose -f docker-compose.prod.yml restart backend"
```

**Long-term Solutions:**

1. **Separate Developer Accounts (Recommended)**
   - Create a second CoC developer account for local development
   - Update local `.env` with different `COC_EMAIL` and `COC_PASSWORD`
   - Each environment maintains its own API keys independently

2. **Shared Key Management**
   - Modify coc.py client to avoid deleting keys from other IPs
   - Both servers can coexist with keys for both IP addresses
   - Requires custom key management logic

3. **Single Environment Development**
   - Only run local OR production at any given time
   - Coordinate restarts to avoid conflicts
   - Not ideal for active development

**Best Practice:** Use separate CoC developer accounts for local and production environments to avoid any interference.

## Troubleshooting

**Backend won't start:**
- Check CoC API credentials in `.env`
- Ensure `data/` directory exists and is writable
- Check Redis connectivity if using cache

**Event monitor showing 403 Forbidden errors:**
- See "CoC API Key Conflicts" in Known Issues section above
- Restart the backend to recreate API keys
- Consider using separate developer accounts for local/production

**Predictions not including CWL data:**
- Restart backend to reload war data
- Check CWL wars exist in `data/cwl/wars/`
- Look for "Loaded X CWL wars" in backend logs

**Clan games session not auto-starting:**
- Event monitor may have missed the start event
- Manually start with `POST /api/clan-games/session/start`
- Check backend logs for errors

**Frontend not connecting to backend:**
- Verify `VITE_API_URL` is set correctly
- Check CORS settings in backend `.env`
- Ensure backend is running and accessible

## Documentation

Located in `/docs/`:
- `clan-games-tracking.md` - Clan games implementation details
- `data-collector-migration.md` - Migration from separate container
- `deployment-strategy.md` - Full deployment guide
- `CWL_HISTORICAL_TRACKING.md` - CWL tracking design
- `multi-clan-backend-design.md` - Future multi-clan architecture
