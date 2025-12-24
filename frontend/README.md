# Clan Manager Frontend

React + TypeScript frontend for the Clan Manager application.

## Architecture

The frontend now uses a unified API client that connects directly to the FastAPI backend, replacing the old Express.js proxy server (`server.js`).

### API Client Structure

**New API Client** (`src/services/api.ts`):
```typescript
import { coc, analytics } from '@/services/api'

// CoC API - Live data from Clash of Clans API
const clan = await coc.getClan('#29U8UJCU0')
const war = await coc.getCurrentWar('#29U8UJCU0')
const player = await coc.getPlayer('#PLAYERTAG')

// Analytics API - Predictions and statistics
const prediction = await analytics.predictPerformance({
  playerTag: '#PLAYERTAG',
  defenderTh: 14,
  defenderHeroes: [90, 90, 65, 50]
})

const stats = await analytics.getPlayerStats('#PLAYERTAG')
const wars = await analytics.getWarHistory({ limit: 20, offset: 0 })
```

**Backward Compatibility** (`src/services/clash-api.ts`):
- Old code using `clashApi` will continue to work
- Proxies calls to the new unified client
- For new code, use the `api.ts` client instead

## Environment Configuration

Create a `.env` file based on `.env.example`:

```bash
# Backend API URL (FastAPI backend)
VITE_API_URL=http://localhost:8000
```

## Development

### Local Development (with Docker)

Run the entire stack with Docker Compose:

```bash
# From project root
docker-compose up
```

Frontend will be available at: http://localhost:5173
Backend API will be available at: http://localhost:8000

### Local Development (without Docker)

1. Start the backend:
```bash
cd ../backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

2. Start the frontend:
```bash
cd frontend
npm install
npm run dev
```

## Scripts

- `npm run dev` - Start Vite dev server (port 5173)
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
frontend/
├── src/
│   ├── components/       # React components
│   │   ├── ui/          # Shadcn UI components
│   │   ├── player-prediction.tsx  # Performance prediction component
│   │   └── ...
│   ├── services/        # API clients
│   │   ├── api.ts       # New unified API client
│   │   └── clash-api.ts # Backward compatibility layer
│   ├── types/           # TypeScript type definitions
│   ├── lib/            # Utilities
│   └── main.tsx        # Entry point
├── public/             # Static assets
├── Dockerfile         # Docker configuration
└── vite.config.ts     # Vite configuration
```

## Migration Guide

### From old `clashApi` to new `api` client

**Before:**
```typescript
import { clashApi } from '@/services/clash-api'

const clan = await clashApi.getClan('#29U8UJCU0')
```

**After:**
```typescript
import { coc } from '@/services/api'

const clan = await coc.getClan('#29U8UJCU0')
```

### New Analytics Features

The new backend provides analytics endpoints not available in the old setup:

```typescript
import { analytics } from '@/services/api'

// Player performance prediction (NEW)
const prediction = await analytics.predictPerformance({
  playerTag: '#PLAYERTAG',
  defenderTh: 14,
  defenderHeroes: [90, 90, 65, 50]
})

// Player statistics (NEW)
const stats = await analytics.getPlayerStats('#PLAYERTAG')

// War history (replaces old getWarLog)
const wars = await analytics.getWarHistory()
```

## Components

### PlayerPrediction

Component for displaying player performance predictions:

```typescript
import { PlayerPrediction } from '@/components/player-prediction'

function MyPage() {
  return <PlayerPrediction />
}
```

Features:
- Input player tag and defender details
- Display expected stars and destruction percentage
- Show confidence intervals
- Indicate prediction reliability

## API Documentation

When the backend is running, visit http://localhost:8000/docs for interactive API documentation (Swagger UI).

## Notes

- The old `server.js` Express proxy has been deprecated
- All API calls now go directly to the FastAPI backend
- The backend handles CORS, so no proxy is needed
- Backend automatically falls back to local storage if S3 is unavailable
