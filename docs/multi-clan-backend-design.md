# Multi-Clan Backend Design

**Version**: 1.0
**Date**: December 2025
**Status**: Design Proposal

---

## Executive Summary

This document outlines the architecture for extending the Clan Manager backend to support multiple clans while:
- **Minimizing costs** through efficient resource sharing
- **Respecting CoC API rate limits** (10 requests/second per IP)
- **Providing near real-time updates** across all managed clans
- **Maintaining current functionality** for existing single-clan features

---

## 1. Architecture Overview

### 1.1 Current Architecture
```
Single Clan Manager Instance
├── Backend (FastAPI + coc.py)
│   ├── Event Monitor (single clan)
│   ├── Data Collection (single clan)
│   └── Analytics API
├── Frontend (React)
└── Redis (caching)
```

### 1.2 Proposed Multi-Clan Architecture
```
Multi-Clan Manager Instance
├── Backend (FastAPI + coc.py)
│   ├── Clan Registry Service
│   ├── Unified Event Monitor (all clans)
│   ├── Priority Queue System
│   ├── Rate Limiter (global)
│   └── Analytics API (clan-filtered)
├── Frontend (React)
│   ├── Clan Selector Component
│   └── Multi-clan Dashboard
└── Redis (shared caching + pub/sub)
```

---

## 2. CoC API Rate Limit Management

### 2.1 Current Limits
- **10 requests/second** per IP address
- **600 requests/minute** sustained
- **36,000 requests/hour** theoretical max

### 2.2 Request Budget Allocation

#### Per-Clan Request Budget (for 5 clans)
```
Total: 600 req/min = 120 req/min per clan
Breaking down:
- Clan updates: 1 req/min (60/hour)
- Member updates: 40 req/min (2400/hour for 40 members)
- War monitoring: 10 req/min (600/hour)
- Event-driven updates: 69 req/min (buffer)
```

#### Scaling Formula
```
Max Clans = (600 req/min) / (Clan Request Rate)

For aggressive monitoring (150 req/min per clan): 4 clans max
For balanced monitoring (100 req/min per clan): 6 clans max
For conservative monitoring (60 req/min per clan): 10 clans max
```

### 2.3 Priority Queue System

Implement request prioritization to ensure critical updates first:

```python
# backend/services/request_queue.py

from enum import IntEnum
import asyncio
from collections import deque
import time

class Priority(IntEnum):
    CRITICAL = 0    # War attacks during battle day
    HIGH = 1        # Active clan games, donations
    NORMAL = 2      # Regular member updates
    LOW = 3         # Bulk historical fetches

class RateLimitedQueue:
    """Global rate-limited request queue for all clans."""

    def __init__(self, requests_per_second: int = 10):
        self.rps = requests_per_second
        self.queues = {p: deque() for p in Priority}
        self.last_request_time = 0
        self.request_interval = 1.0 / requests_per_second

    async def enqueue(self, request_func, priority: Priority, clan_tag: str):
        """Add request to priority queue."""
        self.queues[priority].append((request_func, clan_tag, time.time()))

    async def process_queue(self):
        """Process queue respecting rate limits."""
        while True:
            # Find highest priority non-empty queue
            request = None
            for priority in Priority:
                if self.queues[priority]:
                    request = self.queues[priority].popleft()
                    break

            if not request:
                await asyncio.sleep(0.1)
                continue

            # Rate limiting
            now = time.time()
            time_since_last = now - self.last_request_time
            if time_since_last < self.request_interval:
                await asyncio.sleep(self.request_interval - time_since_last)

            # Execute request
            request_func, clan_tag, enqueue_time = request
            try:
                await request_func()
                self.last_request_time = time.time()
            except Exception as e:
                logger.error(f"Request failed for {clan_tag}: {e}")

# Global queue instance
request_queue = RateLimitedQueue(requests_per_second=10)
```

---

## 3. Clan Registry & Management

### 3.1 Clan Registration

```python
# backend/services/clan_registry.py

from dataclasses import dataclass
from typing import List, Optional
import json
from pathlib import Path

@dataclass
class ClanConfig:
    """Configuration for a managed clan."""
    clan_tag: str
    clan_name: str
    enabled: bool = True
    priority: int = 0  # Higher = more frequent updates
    update_interval: int = 60  # seconds between clan updates
    monitor_wars: bool = True
    monitor_clan_games: bool = True
    monitor_donations: bool = True

class ClanRegistry:
    """Manages multiple clan configurations."""

    def __init__(self, config_path: str = "data/clans.json"):
        self.config_path = Path(config_path)
        self.clans: List[ClanConfig] = []
        self.load_clans()

    def load_clans(self):
        """Load clan configurations from file."""
        if not self.config_path.exists():
            return

        with open(self.config_path, 'r') as f:
            data = json.load(f)
            self.clans = [ClanConfig(**clan) for clan in data.get('clans', [])]

    def save_clans(self):
        """Save clan configurations."""
        with open(self.config_path, 'w') as f:
            json.dump({
                'clans': [
                    {k: v for k, v in vars(clan).items()}
                    for clan in self.clans
                ]
            }, f, indent=2)

    def add_clan(self, clan_config: ClanConfig):
        """Register a new clan."""
        self.clans.append(clan_config)
        self.save_clans()

    def get_active_clans(self) -> List[ClanConfig]:
        """Get all enabled clans."""
        return [c for c in self.clans if c.enabled]

    def get_clan(self, clan_tag: str) -> Optional[ClanConfig]:
        """Get specific clan config."""
        return next((c for c in self.clans if c.clan_tag == clan_tag), None)
```

### 3.2 Clan Data Structure
```json
{
  "clans": [
    {
      "clan_tag": "#29U8UJCUO",
      "clan_name": "Clan A",
      "enabled": true,
      "priority": 2,
      "update_interval": 30,
      "monitor_wars": true,
      "monitor_clan_games": true,
      "monitor_donations": true
    },
    {
      "clan_tag": "#2PP9000",
      "clan_name": "Clan B",
      "enabled": true,
      "priority": 1,
      "update_interval": 60,
      "monitor_wars": false,
      "monitor_clan_games": true,
      "monitor_donations": true
    }
  ]
}
```

---

## 4. Unified Event Monitoring

### 4.1 Multi-Clan Event Monitor

Update the event monitor to handle multiple clans efficiently:

```python
# backend/services/multi_clan_monitor.py

import asyncio
import coc
from typing import List, Dict
from .clan_registry import ClanRegistry, ClanConfig
from .request_queue import request_queue, Priority

class MultiClanEventMonitor:
    """Monitor events across multiple clans."""

    def __init__(self, client: coc.Client, registry: ClanRegistry):
        self.client = client
        self.registry = registry
        self.clan_players: Dict[str, List[str]] = {}  # clan_tag -> player_tags

    async def start(self):
        """Start monitoring all active clans."""
        active_clans = self.registry.get_active_clans()

        # Initialize player tracking for each clan
        for clan_config in active_clans:
            await self.setup_clan_monitoring(clan_config)

        # Start background tasks
        tasks = [
            self.monitor_clan_updates(),
            self.monitor_donation_events(),
            self.monitor_war_events(),
            self.monitor_clan_games(),
        ]
        await asyncio.gather(*tasks)

    async def setup_clan_monitoring(self, config: ClanConfig):
        """Initialize monitoring for a single clan."""
        async def fetch_clan():
            clan = await self.client.get_clan(config.clan_tag)
            self.clan_players[config.clan_tag] = [m.tag for m in clan.members]

            # Setup player tracking
            for member in clan.members:
                await request_queue.enqueue(
                    lambda: self.client.get_player(member.tag),
                    Priority.NORMAL,
                    config.clan_tag
                )

        await request_queue.enqueue(fetch_clan, Priority.HIGH, config.clan_tag)

    async def monitor_clan_updates(self):
        """Periodic clan data updates."""
        while True:
            for clan_config in self.registry.get_active_clans():
                async def update_clan():
                    clan = await self.client.get_clan(clan_config.clan_tag)
                    # Update clan data in storage
                    storage.save_clan_snapshot(clan_config.clan_tag, clan)

                await request_queue.enqueue(
                    update_clan,
                    Priority.NORMAL,
                    clan_config.clan_tag
                )

            # Wait before next round (stagger updates)
            await asyncio.sleep(30)
```

### 4.2 Event Deduplication

Use Redis to prevent duplicate event processing:

```python
# backend/services/event_deduplication.py

import redis
import hashlib
import json

class EventDeduplicator:
    """Prevent duplicate event processing across restarts."""

    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.ttl = 3600  # 1 hour

    def event_key(self, event_type: str, clan_tag: str, data: dict) -> str:
        """Generate unique key for event."""
        payload = f"{event_type}:{clan_tag}:{json.dumps(data, sort_keys=True)}"
        return f"event:{hashlib.sha256(payload.encode()).hexdigest()}"

    def is_duplicate(self, event_type: str, clan_tag: str, data: dict) -> bool:
        """Check if event was already processed."""
        key = self.event_key(event_type, clan_tag, data)
        return self.redis.exists(key)

    def mark_processed(self, event_type: str, clan_tag: str, data: dict):
        """Mark event as processed."""
        key = self.event_key(event_type, clan_tag, data)
        self.redis.setex(key, self.ttl, "1")
```

---

## 5. Caching Strategy

### 5.1 Cache Layers

```
┌─────────────────────────────────────┐
│  Redis Cache (shared across clans)  │
│  TTL: 30s - 5min based on data type │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  CoC API (rate-limited)             │
└─────────────────────────────────────┘
```

### 5.2 Cache Keys Structure
```
clan:{clan_tag}:data              → Full clan data (TTL: 60s)
clan:{clan_tag}:members           → Member list (TTL: 120s)
player:{player_tag}:data          → Player data (TTL: 300s)
war:{clan_tag}:current            → Current war (TTL: 30s during war)
war:{clan_tag}:log                → War log (TTL: 600s)
events:{clan_tag}:recent          → Recent events (TTL: 60s)
```

### 5.3 Smart Cache Invalidation

```python
# backend/services/cache_manager.py

import redis
from typing import Optional, Any
import json

class ClanCacheManager:
    """Intelligent caching for multi-clan data."""

    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client

    def get_cached(self, key: str) -> Optional[Any]:
        """Get from cache."""
        data = self.redis.get(key)
        return json.loads(data) if data else None

    def set_cached(self, key: str, value: Any, ttl: int):
        """Set cache with TTL."""
        self.redis.setex(key, ttl, json.dumps(value))

    def invalidate_clan(self, clan_tag: str):
        """Invalidate all cache for a clan."""
        pattern = f"clan:{clan_tag}:*"
        for key in self.redis.scan_iter(match=pattern):
            self.redis.delete(key)

    async def get_or_fetch(self, key: str, fetch_func, ttl: int):
        """Cache-aside pattern."""
        cached = self.get_cached(key)
        if cached:
            return cached

        data = await fetch_func()
        self.set_cached(key, data, ttl)
        return data
```

---

## 6. Database Schema Updates

### 6.1 Add Clan Context to All Tables

```sql
-- Add clan_tag to existing tables
ALTER TABLE wars ADD COLUMN clan_tag VARCHAR(20) NOT NULL DEFAULT '#29U8UJCUO';
ALTER TABLE events ADD COLUMN clan_tag VARCHAR(20) NOT NULL DEFAULT '#29U8UJCUO';
ALTER TABLE player_activity ADD COLUMN clan_tag VARCHAR(20);

-- Create indexes for clan filtering
CREATE INDEX idx_wars_clan_tag ON wars(clan_tag);
CREATE INDEX idx_events_clan_tag ON events(clan_tag);
CREATE INDEX idx_activity_clan_tag ON player_activity(clan_tag);

-- New table for clan metadata
CREATE TABLE IF NOT EXISTS clans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clan_tag VARCHAR(20) UNIQUE NOT NULL,
    clan_name VARCHAR(100) NOT NULL,
    enabled BOOLEAN DEFAULT 1,
    priority INTEGER DEFAULT 0,
    last_update TIMESTAMP,
    member_count INTEGER,
    settings JSON
);
```

### 6.2 Update Data Storage Layer

```python
# shared/utils/storage.py - Add clan filtering

class Storage:
    def save_war(self, war_data: dict, clan_tag: str):
        """Save war with clan context."""
        war_data['clan_tag'] = clan_tag
        # existing save logic

    def get_recent_wars(self, clan_tag: Optional[str] = None, limit: int = 20):
        """Get wars, optionally filtered by clan."""
        query = "SELECT * FROM wars"
        if clan_tag:
            query += f" WHERE clan_tag = '{clan_tag}'"
        query += f" ORDER BY timestamp DESC LIMIT {limit}"
        # execute and return
```

---

## 7. Frontend Clan Selector

### 7.1 Reusable Clan Selector Component

```tsx
// frontend/src/components/clan-selector.tsx

import { useQuery } from '@tanstack/react-query'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useClanStore } from '@/stores/clan-store'

export function ClanSelector() {
  const { selectedClan, setSelectedClan } = useClanStore()

  const { data: clans } = useQuery({
    queryKey: ['clans'],
    queryFn: async () => {
      const response = await fetch('/api/clans')
      return response.json()
    },
    refetchInterval: 60000, // Refresh every minute
  })

  return (
    <Select value={selectedClan} onValueChange={setSelectedClan}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Select clan..." />
      </SelectTrigger>
      <SelectContent>
        {clans?.map((clan: any) => (
          <SelectItem key={clan.clan_tag} value={clan.clan_tag}>
            {clan.clan_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
```

### 7.2 Global Clan State

```typescript
// frontend/src/stores/clan-store.ts

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ClanState {
  selectedClan: string
  setSelectedClan: (clan: string) => void
}

export const useClanStore = create<ClanState>()(
  persist(
    (set) => ({
      selectedClan: import.meta.env.VITE_CLAN_TAG || '',
      setSelectedClan: (clan) => set({ selectedClan: clan }),
    }),
    {
      name: 'clan-selection',
    }
  )
)
```

---

## 8. Cost Optimization Strategies

### 8.1 Resource Sharing

**Single Instance Architecture** (Recommended):
- One backend container serves all clans
- Shared Redis cache
- Shared database
- **Savings**: $50/month vs separate instances

### 8.2 Intelligent Update Intervals

Adjust update frequency based on activity:

```python
def get_update_interval(clan_tag: str, current_hour: int) -> int:
    """Dynamic update intervals based on activity."""

    # Peak hours (evening): 30s updates
    if 18 <= current_hour <= 23:
        return 30

    # Off-hours: 120s updates
    elif 0 <= current_hour <= 6:
        return 120

    # During CWL/Clan Games: 20s updates
    if is_cwl_active(clan_tag) or is_clan_games_active(clan_tag):
        return 20

    # Default: 60s
    return 60
```

### 8.3 Batch API Requests

```python
async def fetch_all_members_batched(member_tags: List[str], batch_size: int = 10):
    """Fetch members in batches to utilize rate limit efficiently."""
    results = []

    for i in range(0, len(member_tags), batch_size):
        batch = member_tags[i:i + batch_size]
        batch_results = await asyncio.gather(
            *[request_queue.enqueue(
                lambda tag=tag: client.get_player(tag),
                Priority.NORMAL,
                clan_tag
            ) for tag in batch]
        )
        results.extend(batch_results)

    return results
```

### 8.4 Estimated Costs

| Clans | Backend | Redis | DB | Total/mo |
|-------|---------|-------|----|---------:|
| 1     | $12     | $7    | -  | $19      |
| 3     | $12     | $7    | -  | $19      |
| 5     | $12     | $7    | -  | $19      |
| 10    | $24     | $7    | -  | $31      |

**Key**: Costs stay flat until ~8 clans, then need larger droplet.

---

## 9. Near Real-Time Updates

### 9.1 WebSocket Push Updates

Add WebSocket support for live updates:

```python
# backend/routers/websocket.py

from fastapi import WebSocket
import asyncio

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, clan_tag: str):
        await websocket.accept()
        if clan_tag not in self.active_connections:
            self.active_connections[clan_tag] = []
        self.active_connections[clan_tag].append(websocket)

    async def broadcast(self, clan_tag: str, message: dict):
        """Send update to all connected clients for clan."""
        if clan_tag in self.active_connections:
            for connection in self.active_connections[clan_tag]:
                await connection.send_json(message)

manager = ConnectionManager()

@app.websocket("/ws/{clan_tag}")
async def websocket_endpoint(websocket: WebSocket, clan_tag: str):
    await manager.connect(websocket, clan_tag)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.active_connections[clan_tag].remove(websocket)
```

### 9.2 Event-Driven Architecture

```python
# backend/services/event_bus.py

import asyncio
from typing import Callable, Dict, List

class EventBus:
    """Pub/sub for clan events."""

    def __init__(self):
        self.subscribers: Dict[str, List[Callable]] = {}

    def subscribe(self, event_type: str, handler: Callable):
        """Subscribe to event type."""
        if event_type not in self.subscribers:
            self.subscribers[event_type] = []
        self.subscribers[event_type].append(handler)

    async def publish(self, event_type: str, clan_tag: str, data: dict):
        """Publish event to all subscribers."""
        if event_type in self.subscribers:
            for handler in self.subscribers[event_type]:
                await handler(clan_tag, data)

event_bus = EventBus()

# Subscribe to donation events
event_bus.subscribe('donation', async def(clan_tag, data):
    # Update real-time dashboard
    await manager.broadcast(clan_tag, {
        'type': 'donation',
        'data': data
    })
)
```

---

## 10. Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Implement ClanRegistry service
- [ ] Add clan_tag to database schema
- [ ] Create rate-limited request queue
- [ ] Update storage layer with clan filtering

### Phase 2: Multi-Clan Monitoring (Week 2)
- [ ] Refactor event monitor for multiple clans
- [ ] Implement priority-based request scheduling
- [ ] Add Redis caching layer
- [ ] Event deduplication system

### Phase 3: Frontend Updates (Week 3)
- [ ] Create clan selector component
- [ ] Add global clan state management
- [ ] Update all pages to use selected clan
- [ ] Multi-clan dashboard view

### Phase 4: Optimization (Week 4)
- [ ] WebSocket real-time updates
- [ ] Dynamic update intervals
- [ ] Performance testing with 5+ clans
- [ ] Cost monitoring dashboard

### Phase 5: Testing & Launch (Week 5)
- [ ] Load testing (simulate 10 clans)
- [ ] API rate limit validation
- [ ] Documentation updates
- [ ] Production deployment

---

## 11. API Rate Limit Optimization Guide

### 11.1 Request Patterns

**Bad Pattern** (wastes API calls):
```python
# Fetching same player multiple times
for clan in clans:
    for member in clan.members:
        player = await client.get_player(member.tag)  # Duplicate calls!
```

**Good Pattern** (deduplicate):
```python
# Fetch each unique player once
all_player_tags = set()
for clan in clans:
    all_player_tags.update(m.tag for m in clan.members)

player_cache = {}
for tag in all_player_tags:
    player_cache[tag] = await request_queue.enqueue(...)
```

### 11.2 Monitoring Rate Limit Usage

```python
# backend/services/rate_limit_monitor.py

class RateLimitMonitor:
    """Track API usage metrics."""

    def __init__(self):
        self.request_count = 0
        self.last_reset = time.time()

    def record_request(self, clan_tag: str):
        """Record API request."""
        self.request_count += 1

        # Reset counter every minute
        now = time.time()
        if now - self.last_reset >= 60:
            logger.info(f"API usage: {self.request_count} req/min")
            if self.request_count > 550:  # 90% of limit
                logger.warning("Approaching rate limit!")
            self.request_count = 0
            self.last_reset = now

    def get_current_rate(self) -> float:
        """Get current requests per second."""
        elapsed = time.time() - self.last_reset
        return self.request_count / elapsed if elapsed > 0 else 0
```

### 11.3 Rate Limit Dashboard

Add metrics endpoint:

```python
@app.get("/api/metrics/rate-limit")
async def get_rate_limit_metrics():
    return {
        "current_rps": monitor.get_current_rate(),
        "requests_this_minute": monitor.request_count,
        "limit_rps": 10,
        "limit_rpm": 600,
        "utilization_pct": (monitor.request_count / 600) * 100
    }
```

---

## 12. Scaling Limits & Costs

### 12.1 Scaling Table

| Clans | Members/clan | Total Requests/min | Margin | Droplet Cost | Total/mo |
|-------|--------------|-------------------:|-------:|-------------:|---------:|
| 1     | 40           | 60                 | 90%    | $12          | $19      |
| 3     | 40           | 180                | 70%    | $12          | $19      |
| 5     | 40           | 300                | 50%    | $12          | $19      |
| 7     | 40           | 420                | 30%    | $12          | $19      |
| 10    | 40           | 600                | 0%     | $24          | $31      |

### 12.2 Hard Limits

- **API Rate Limit**: 600 req/min
- **Recommended Max**: 10 clans (60 req/min per clan)
- **Absolute Max**: 15 clans (40 req/min per clan, degraded)

### 12.3 Scale-Out Strategy

If managing >10 clans, split into multiple instances:

```
Instance 1: Clans 1-10  → IP Address A
Instance 2: Clans 11-20 → IP Address B
Instance 3: Clans 21-30 → IP Address C
```

Each instance gets separate rate limit (600 req/min).

---

## 13. Migration Guide

### Step 1: Backup Current Data
```bash
# Backup database
sqlite3 data/clan_data.db ".backup data/backup_$(date +%Y%m%d).db"

# Backup war logs
tar -czf data/wars_backup.tar.gz data/wars/
```

### Step 2: Add Clan Context
```python
# Run migration script
python scripts/migrate_add_clan_tags.py --clan-tag "#29U8UJCUO"
```

### Step 3: Update Environment
```env
# .env - Add multi-clan support
CLAN_TAGS=["#29U8UJCUO", "#ABC123", "#XYZ789"]
PRIMARY_CLAN_TAG="#29U8UJCUO"
```

### Step 4: Deploy Updated Backend
```bash
docker-compose down
docker-compose build backend
docker-compose up -d
```

### Step 5: Verify Multi-Clan Operation
```bash
# Check all clans are monitored
curl http://localhost:8000/api/clans

# Verify event monitoring
curl http://localhost:8000/api/metrics/rate-limit
```

---

## Conclusion

This architecture enables efficient multi-clan management by:
- **Sharing resources** across clans (single backend instance)
- **Intelligent request scheduling** (priority queue + rate limiting)
- **Smart caching** (Redis with TTLs)
- **Near real-time updates** (WebSocket push + event-driven)

**Recommended Start**: 3-5 clans on single $12 droplet (cost-effective, plenty of headroom).

**Scaling Path**: Add clans incrementally, monitor API usage, upgrade droplet only when needed (~8-10 clans).
