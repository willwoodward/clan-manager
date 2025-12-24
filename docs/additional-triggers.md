# Additional Event Triggers

## Overview
Automated tracking for monthly seasons, Clan War League, and weekly league resets.

---

## 1. Season End (Monthly)

**Trigger**: Last Monday of each month at 5:00 AM UTC

**Implementation**:
```python
@client.event
@coc.ClientEvents.season_end()
async def on_season_end():
    """Capture player stats at season end."""
    clan = await client.get_clan(settings.clan_tag)

    season_data = {
        "season_id": datetime.now().strftime("%Y-%m"),
        "end_time": datetime.now().isoformat(),
        "players": []
    }

    for member in clan.members:
        player = await client.get_player(member.tag)
        season_data["players"].append({
            "tag": player.tag,
            "name": player.name,
            "trophies": player.trophies,
            "best_trophies": player.best_trophies,
            "war_stars": player.war_stars,
            "attack_wins": player.attack_wins,
            "defense_wins": player.defense_wins,
            "donations": player.donations,
            "received": player.received,
            "league": player.league.name if player.league else None,
            "town_hall": player.town_hall
        })

    # Save to data/seasons/{year}-{month}.json
    storage.save_season_data(season_data)
```

**Data Stored**:
- Player trophy counts (current/best)
- War stats (stars, attack/defense wins)
- Donation stats
- League placement
- Town hall level

**Use Cases**:
- Track trophy progression month-over-month
- Identify consistent high performers
- Monitor donation trends

---

## 2. Clan War League (CWL)

**Triggers**:
- CWL start
- CWL day change (new war)
- CWL end

**Implementation**:
```python
@client.event
@coc.ClientEvents.war_state_change()
async def on_war_state_change(old_war, new_war):
    """Track CWL wars (different from regular wars)."""
    if new_war.is_cwl:
        if new_war.state == "preparation":
            await on_cwl_day_start(new_war)
        elif new_war.state == "warEnded":
            await on_cwl_day_end(new_war)

async def on_cwl_day_start(war):
    """Log CWL war start."""
    cwl_data = {
        "cwl_id": f"cwl_{war.preparation_start_time.timestamp()}",
        "day": war.war_tag,  # Unique per CWL day
        "state": "started",
        "clan_tag": war.clan_tag,
        "opponent": war.opponent.name,
        "start_time": war.start_time.isoformat()
    }
    storage.save_cwl_war(cwl_data)

async def on_cwl_day_end(war):
    """Log CWL war result."""
    cwl_result = {
        "day": war.war_tag,
        "state": "ended",
        "result": war.status,  # won/lost/tie
        "stars": war.clan.stars,
        "destruction": war.clan.destruction,
        "opponent_stars": war.opponent.stars,
        "opponent_destruction": war.opponent.destruction,
        "attacks": [
            {
                "attacker": atk.attacker_tag,
                "defender": atk.defender_tag,
                "stars": atk.stars,
                "destruction": atk.destruction
            }
            for atk in war.attacks
        ]
    }
    storage.update_cwl_war(cwl_result)
```

**Data Stored**:
- Each CWL day result (7-8 wars per month)
- Attack performance per player
- Overall CWL placement/medals
- Stars and destruction percentages

**Use Cases**:
- CWL performance dashboard
- Identify best CWL attackers
- Track league promotion/demotion

---

## 3. Legend League Reset (Weekly)

**Trigger**: Every Monday at 5:00 AM UTC

**Implementation**:
```python
@triggers.CronTrigger(hour=5, minute=0, day_of_week=0)  # Monday 5 AM
async def on_legend_league_reset():
    """Track Legend League players' weekly performance."""
    clan = await client.get_clan(settings.clan_tag)

    # Find Legend League players (5000+ trophies)
    legend_players = []
    for member in clan.members:
        if member.trophies >= 5000:
            player = await client.get_player(member.tag)
            legend_players.append({
                "tag": player.tag,
                "name": player.name,
                "trophies": player.trophies,
                "legend_statistics": {
                    "previous_season": player.legend_statistics.previous_season.trophies if player.legend_statistics else None,
                    "best_season": player.legend_statistics.best_season.trophies if player.legend_statistics else None
                }
            })

    if legend_players:
        reset_data = {
            "reset_date": datetime.now().strftime("%Y-W%U"),
            "timestamp": datetime.now().isoformat(),
            "players": legend_players
        }
        storage.save_legend_reset(reset_data)
```

**Data Stored**:
- Weekly trophy snapshots for Legend players
- Previous/best season performance
- Week-over-week trophy delta

**Use Cases**:
- Track Legend League pushing
- Identify top trophy pushers
- Monitor weekly trophy gains/losses

---

## File Structure
```
data/
├── seasons/
│   └── 2025-12.json          # Monthly season data
├── cwl/
│   ├── 2025-12/
│   │   ├── day1.json
│   │   ├── day2.json
│   │   └── summary.json      # Overall CWL results
├── legend/
│   └── 2025-W51.json         # Weekly Legend resets
```

---

## Implementation Priority

| Trigger | Priority | Complexity | Impact |
|---------|----------|------------|--------|
| **Season End** | High | Low | Track long-term player progression |
| **CWL** | High | Medium | Most requested feature, competitive insights |
| **League Reset** | High | Low | Tracks ALL players weekly |
| **Capital Raid** | Medium | Low | Track capital raid performance |

---

## Implementation Status ✅

**Completed:** December 24, 2025

### What Was Implemented

**1. Season End Tracking** (`on_season_end()`)
- Captures ALL player stats at end of each month
- Stores trophies, war stars, donations, league, TH level
- Uses state file to prevent duplicate processing on restart
- Auto-triggers via `ClientEvents.season_end()`

**2. CWL War Tracking** (`check_war_state()`)
- Detects CWL wars via `war.is_cwl` property
- Saves each CWL war separately with full attack log
- Stores in `data/cwl/{month}/{war_tag}.json`
- Integrated into existing war state checker

**3. League Reset Tracking** (`check_league_reset()`)
- **Tracks ALL players** (not just legend league)
- Runs at **4:55 AM UTC** (5 mins before actual reset)
- Checks every minute during reset window (4:50-5:10 AM)
- Stores weekly snapshots of all player trophies and leagues
- Uses state file for restart resilience

**4. Capital Raid Weekend** (`on_raid_weekend_end()`)
- Captures raid log when weekend ends
- Stores total capital loot, raids completed, attack log
- Uses state file to prevent duplicates
- Auto-triggers via `ClientEvents.raid_weekend_end()`

### Container Restart Resilience

All triggers are resilient to container starts/stops:

| Trigger | Resilience Mechanism |
|---------|---------------------|
| **Season End** | State file tracks last processed season ID |
| **CWL Wars** | Unique war_tag prevents duplicates |
| **League Reset** | State file tracks last processed reset ID |
| **Capital Raid** | State file tracks last processed raid ID |
| **Clan Games** | Startup recovery syncs active sessions |
| **Regular Wars** | Global variable tracks last saved war |

### Code Location
- Event handlers: `backend/services/event_monitor.py`
- Storage: `shared/utils/event_storage.py`
- State files: `data/event_state/*.json`

### Data Structure
```
data/
├── seasons/2025-12.json      # Monthly snapshots
├── cwl/2025-12/              # CWL wars by month
│   └── war_xxx.json
├── legend/2025-W51.json      # Weekly league resets (ALL players)
├── capital_raids/            # Raid weekend results
│   └── raid_2025-W51.json
└── event_state/              # Resilience state
    ├── season_end_state.json
    ├── league_reset_state.json
    ├── capital_raid_state.json
    └── cwl_state.json
```
