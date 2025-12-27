# CWL Historical Tracking Implementation

## Overview

Clan War League (CWL) is a monthly competitive event where groups of 8 clans compete in a round-robin tournament over 8 days. This document outlines how to implement historical tracking of CWL performance.

## CWL Format

- **Duration**: 8 days (1 prep day + 7 war days)
- **Format**: Round-robin tournament (each clan vs every other clan once = 7 wars)
- **Attack Limit**: 1 attack per player per war (vs 2 in regular wars)
- **Outcome**: Top performers promoted to higher league, bottom demoted
- **Rewards**: League Medals based on league tier and performance

## Data Collection

### 1. Season-Level Data

Track once per CWL season (monthly):

```python
{
    "season_id": str,           # Format: "2025-12" (year-month)
    "start_time": datetime,
    "end_time": datetime,
    "league_start": str,        # League at season start (e.g., "Gold League II")
    "league_end": str,          # League at season end (after promotion/demotion)
    "total_stars": int,         # Total stars earned across all 7 wars
    "total_destruction": float, # Total destruction % across all 7 wars
    "wars_won": int,            # Number of wars won (out of 7)
    "wars_lost": int,
    "wars_tied": int,
    "final_rank": int,          # Final rank in group (1-8)
    "group_clans": list[str],   # Tags of other 7 clans in group
    "promoted": bool,           # True if promoted to higher league
    "demoted": bool,            # True if demoted to lower league
}
```

### 2. War-Level Data (Per War Within Season)

Track for each of the 7 wars in a CWL season:

```python
{
    "war_tag": str,             # Unique war identifier from API
    "season_id": str,           # Parent season
    "round": int,               # Round number (1-7)
    "opponent_tag": str,
    "opponent_name": str,
    "war_date": datetime,
    "clan_stars": int,
    "opponent_stars": int,
    "clan_destruction": float,
    "opponent_destruction": float,
    "result": str,              # "win", "loss", or "tie"
    "roster_size": int,         # 15 or 30
}
```

### 3. Player-Level Data (Optional - for detailed analytics)

Track per player per CWL season:

```python
{
    "player_tag": str,
    "season_id": str,
    "wars_participated": int,   # How many of 7 wars player was rostered
    "attacks_used": int,        # Should be ≤ wars_participated
    "total_stars": int,
    "total_destruction": float,
    "medals_earned": int,       # League Medals earned (if trackable)
}
```

## API Integration

### Available Endpoints

1. **Current CWL Group**: `/clans/{clanTag}/currentwar/leaguegroup`
   - Returns: season ID, all clans in group, war tags for each round
   - Only available during active CWL (8-day window)

2. **Individual War Data**: `/clanwarleagues/wars/{warTag}`
   - Returns: detailed war data for each CWL war
   - Available using war tags from league group response

### Data Collection Strategy

**During Active CWL (Daily Job)**:
```python
# Run daily during CWL week
1. Check if CWL is active via league group endpoint
2. If active:
   - Store/update season-level data
   - Fetch all war tags from current and past rounds
   - For each war tag:
     - Fetch individual war data
     - Extract and store war-level stats
     - Extract player performance (if tracking)
3. On final day (day 8):
   - Record final rank, league changes, promotion/demotion status
```

**Post-CWL**:
- League group endpoint returns 404 after CWL ends
- Must capture all data during the active 8-day window
- Store in persistent storage (S3 or local JSON files)

## Storage Schema

### File Structure
```
data/
  cwl/
    seasons/
      2025-12.json          # Season summary
      2025-11.json
    wars/
      {war_tag_1}.json      # Individual war details
      {war_tag_2}.json
```

### Storage Manager Methods

```python
# New methods to add to StorageManager class
async def store_cwl_season(season_id: str, data: dict)
async def get_cwl_season(season_id: str) -> dict
async def list_cwl_seasons(limit: int = 12) -> list[dict]

async def store_cwl_war(war_tag: str, data: dict)
async def get_cwl_war(war_tag: str) -> dict
async def list_cwl_wars(season_id: str) -> list[dict]
```

## Backend Implementation

### New Router: `/backend/routers/cwl_statistics.py`

```python
@router.get("/clan/{clan_tag}/statistics/cwl/history")
async def get_cwl_history(clan_tag: str, limit: int = 12):
    """
    Get historical CWL performance.
    Returns last N seasons with league progression.
    """

@router.get("/clan/{clan_tag}/statistics/cwl/season/{season_id}")
async def get_cwl_season_details(clan_tag: str, season_id: str):
    """
    Get detailed stats for a specific CWL season.
    Includes all 7 wars and player performance.
    """
```

### Event Monitor Integration

Add to `/backend/services/event_monitor.py`:

```python
async def check_cwl_status():
    """Check if CWL is active and sync data"""
    try:
        league_group = await coc_client.get_current_war_league_group(clan_tag)
        if league_group:
            await sync_cwl_data(league_group)
    except NotFound:
        # CWL not active
        pass

# Call check_cwl_status() in daily monitoring loop
```

## Frontend Components

### Statistics Card
- Display: Current league with medal range (already implemented)
- On click: Open modal with historical league progression

### Modal Chart
- **Line chart**: League tier progression over time (Y-axis: league rank 1-17, X-axis: months)
- **Tooltip**: Show league name, win rate, final rank for each season
- Alternative: Bar chart showing wins/losses per season

## Estimated Implementation Effort

1. **Backend** (4-6 hours):
   - Storage methods for CWL data
   - API endpoints for history
   - Event monitor integration for data collection

2. **Frontend** (2-3 hours):
   - Chart component for league progression
   - Update modal to display CWL history

3. **Testing** (2-3 hours):
   - Wait for next CWL to test live data collection
   - Mock data testing before live CWL

## References

- [Clan War Leagues Explained](https://blueprintcoc.com/blogs/clash-of-clans-faqs/clan-war-league-explained)
- [CWL Wiki](https://clashofclans.fandom.com/wiki/Clan_War_Leagues)
- [CWL Support Article](https://support.supercell.com/clash-of-clans/en/articles/about-cwl.html)
- [coc.py API Documentation](https://cocpy.readthedocs.io/en/rewrite/api.html)
- [Clash of Clans Official API](https://developer.clashofclans.com/)
