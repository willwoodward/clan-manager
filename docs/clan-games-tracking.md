# Clan Games Tracking System

## Overview
Track clan games participation and history using the "Games Champion" achievement from the CoC API.

## Data Flow

### 1. Session Start (Automatic)
**Trigger**: `coc.Client.on_clan_games_start()` event

**Action**:
```python
# When clan games start, snapshot all players' current Games Champion points
initial_standings = {}
for member in clan.members:
    player = await client.get_player(member.tag)
    games_achievement = player.get_achievement("Games Champion")
    initial_standings[member.tag] = games_achievement.value  # Lock current total

# Start new session
storage.start_session(initial_standings=initial_standings)
```

**Result**: Creates `current_session.json` with baseline points for all members

### 2. Real-time Updates (Ongoing)
**Trigger**: `coc.Client.on_player_achievement()` event

**Action**:
```python
# When Games Champion achievement increases
storage.update_player_points(
    player_tag=player.tag,
    player_name=player.name,
    new_total_points=new_achievement_value
)
```

**Result**: Updates `current_session.json` with new points, calculates earned points

### 3. Session End (Automatic)
**Trigger**: `coc.Client.on_clan_games_end()` event

**Action**:
```python
# When clan games end, finalize the session
completed_session = storage.end_session()
```

**Result**:
- Marks session as "completed"
- Moves session to `sessions.json` (historical archive)
- Clears `current_session.json`

**Stored Data**:
```json
{
  "session_id": "games_1766536074",
  "start_time": "2025-12-24T00:27:54",
  "end_time": "2025-12-30T23:59:59",
  "status": "completed",
  "summary": {
    "total_points": 49200,
    "participants": 11,
    "participation_rate": 25.6,
    "clan_size": 43
  },
  "leaderboard": [
    {
      "rank": 1,
      "player_tag": "#G88UCVPL",
      "player_name": "Will Woodward",
      "points_earned": 10000,
      "start_points": 139335,
      "final_points": 149335
    },
    {
      "rank": 2,
      "player_tag": "#QVYPRYPC9",
      "player_name": "Chris",
      "points_earned": 10000,
      "start_points": 19950,
      "final_points": 29950
    }
    // ... more players
  ]
}
```

## File Structure
```
data/clan_games/
├── current_session.json   # Active session (cleared when games end)
└── sessions.json          # Historical archive (appended to when games end)
```

## Implementation Status
- ✅ Storage system (`clan_games_storage.py`)
- ✅ API endpoints (`/api/clan-games/*`)
- ✅ Frontend charts (historical trends)
- ✅ Automatic session start (`on_clan_games_start()` event)
- ✅ Automatic session end (`on_clan_games_end()` event)
- ✅ Startup recovery (detects active games on container start)
- ✅ Manual session management via `scripts/init_clan_games.py`

## Automatic Workflow (Default)
The system now handles clan games tracking automatically:

1. **Start**: Automatic when clan games begin (`ClientEvents.clan_games_start()`)
   - Snapshots ALL clan members' Games Champion points
   - Creates new session with baseline data
   - Logs event to feed

2. **Updates**: Automatic via event monitor (`PlayerEvents.achievements()`)
   - Detects Games Champion achievement increases
   - Updates player points in real-time
   - Calculates points earned automatically

3. **End**: Automatic when clan games complete (`ClientEvents.clan_games_end()`)
   - Finalizes session with summary statistics
   - Moves to historical archive
   - Logs completion event with total points

4. **Recovery**: Automatic on container startup
   - Detects if clan games are currently active
   - Creates session if none exists
   - Syncs existing session with current members

## Manual Management (Optional)
For manual control or troubleshooting:

1. **Manual Start**: Run `python scripts/init_clan_games.py`
   - Useful if starting mid-games with known standings
   - Edit `CURRENT_STANDINGS` dict with current contributors

2. **Manual Sync**: Run `python scripts/sync_clan_games_session.py`
   - Adds missing members to active session
   - Updates all players with current points

3. **Manual End**: Call `/api/clan-games/session/end` endpoint
   - Only needed if automatic end fails

## Important Notes
- **Always snapshot ALL clan members** when starting a session
- Missing members will have `points_earned = 0` until synced
- New clan members who join during games get current total as baseline
- Event monitor automatically updates points when achievements change
