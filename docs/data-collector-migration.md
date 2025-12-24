# Data Collector Migration to Backend

## Current Architecture
```
┌─────────────────┐     ┌──────────────────┐
│  data-collector │     │     backend      │
│   container     │     │    container     │
├─────────────────┤     ├──────────────────┤
│ war_monitor.py  │     │ FastAPI server   │
│ event_monitor   │     │ event_monitor    │
│  (226 lines)    │     │  (494 lines)     │
└─────────────────┘     └──────────────────┘
```
**Issues**: Duplicate event monitoring, separate containers, resource overhead

## Proposed Architecture
```
┌──────────────────────────┐
│       backend            │
│       container          │
├──────────────────────────┤
│ FastAPI server           │
│ event_monitor (unified)  │
│ war_monitor              │
│ clan_games triggers      │
└──────────────────────────┘
```
**Benefits**: Single source of truth, shared coc.py client, easier maintenance

## Migration Steps

### 1. Merge War Monitoring
**Action**: Add war monitoring to backend's event_monitor.py

```python
# backend/services/event_monitor.py

@triggers.on_war_state_change()
async def on_war_state_change(old_war, new_war):
    """Track war state changes and schedule war data collection."""
    if new_war.state == "warEnded":
        # Fetch and save final war data
        await save_war_data(new_war)
```

**Copy from**: `data-collector/war_monitor.py` → `backend/services/event_monitor.py`

### 2. Add Clan Games Triggers
**Action**: Implement session automation

```python
# backend/services/event_monitor.py

@client.event
@coc.ClientEvents.clan_games_start()
async def on_clan_games_start(clan_tag, start_time):
    """Auto-start session when clan games begin."""
    # Get all player standings
    clan = await client.get_clan(clan_tag)
    initial_standings = {}
    for member in clan.members:
        player = await client.get_player(member.tag)
        achievement = player.get_achievement("Games Champion")
        initial_standings[member.tag] = achievement.value

    # Start session
    clan_games_storage.start_session(initial_standings)

@client.event
@coc.ClientEvents.clan_games_end()
async def on_clan_games_end(clan_tag, end_time):
    """Auto-end session when clan games complete."""
    clan = await client.get_clan(clan_tag)
    clan_games_storage.end_session(clan_size=clan.member_count)
```

### 3. Remove Data Collector Container
**Action**: Update docker-compose.yml

```yaml
# Remove these lines:
services:
  data-collector:
    build:
      context: .
      dockerfile: data-collector/Dockerfile
    volumes:
      - ./data-collector:/app/data-collector
      - ./data-collector/data:/app/data
    command: python data-collector/war_monitor.py
```

### 4. Clean Up
```bash
# Archive old data-collector code
mv data-collector data-collector.old

# Restart backend with unified monitoring
docker-compose restart backend
```

## Implementation Checklist
- [x] Copy war monitoring logic to backend/services/event_monitor.py
- [x] Add clan games start trigger
- [x] Add clan games end trigger
- [x] Test event monitoring works
- [x] Remove data-collector from docker-compose.yml
- [x] Archive data-collector directory (moved to `data-collector.archived`)

## Effort Estimate
**Easy migration** - Most code exists, just needs consolidation
- Event monitoring: Backend already handles this ✅
- War monitoring: Copy existing logic from data-collector (~1-2 hours)
- Clan games triggers: New implementation (~2-3 hours)
- Testing & cleanup: ~1 hour

**Total**: ~4-6 hours work

## Risks & Mitigations
| Risk | Mitigation |
|------|------------|
| Missing war data during migration | Keep data-collector running until backend tested |
| Event listener conflicts | Backend already runs event monitor successfully |
| Clan games trigger timing | Add manual fallback via API endpoints |

---

## Migration Complete! ✅

**Completed:** December 24, 2025

### What Was Changed

**1. Backend Event Monitor** (`backend/services/event_monitor.py`)
- Added `save_war_data()` function to fetch and save detailed war data
- Added `fetch_player_war_data()` helper to get player details
- Integrated war data saving into `check_war_state()` on war end
- Clan games triggers already implemented (auto-start/end sessions)

**2. Docker Configuration** (`docker-compose.yml`)
- Removed `data-collector` service entirely
- Updated backend volume mapping: `./data:/app/data`
- Single container now handles all event monitoring

**3. Data Migration**
- Moved all data from `data-collector/data/` → `data/`
- Archived old code to `data-collector.archived/`
- All historical war data preserved

### New Unified Architecture
```
┌──────────────────────────────┐
│       backend                │
│      (single container)      │
├──────────────────────────────┤
│ FastAPI server               │
│ Event monitor (unified):     │
│  - War monitoring ✅         │
│  - Clan games auto-start ✅  │
│  - Clan games auto-end ✅    │
│  - Member tracking ✅        │
│  - Donation tracking ✅      │
│  - Activity logging ✅       │
└──────────────────────────────┘
```

### Benefits Achieved
- ✅ Single source of truth for all events
- ✅ Shared coc.py client (better rate limiting)
- ✅ Reduced resource usage (1 fewer container)
- ✅ Easier maintenance (single codebase)
- ✅ No duplicate event processing

### Testing
- ✅ Backend starts successfully
- ✅ Event monitoring active for all event types
- ✅ Clan games session detection working
- ✅ War state checking running (5-minute intervals)
- ✅ All data accessible from unified location
