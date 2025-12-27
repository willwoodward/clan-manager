"""Clan statistics API for raid medals, CWL medals, clan games, and ores."""

import sys
from pathlib import Path
from fastapi import APIRouter, HTTPException
from typing import Optional, List
import logging
from datetime import datetime, timedelta

# Add shared to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from shared.utils.resource_calculator import ResourceCalculator
from shared.utils.storage import StorageManager
from ..services.coc_client import coc_client
from ..config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize storage manager
storage_manager = StorageManager(
    use_s3=settings.use_s3,
    s3_bucket=settings.s3_bucket,
    s3_prefix=settings.s3_prefix,
    s3_region=settings.s3_region,
    local_data_dir=settings.local_data_dir
)


@router.get("/clan/{clan_tag}/statistics/summary")
async def get_statistics_summary(clan_tag: str):
    """
    Get summary of all clan statistics.

    Args:
        clan_tag: Clan tag (with or without #)

    Returns:
        Dict with raid_medals, cwl_medals, clan_games, and ore_estimate
    """
    try:
        # Get clan info for war league
        clan_data = await coc_client.get_clan(clan_tag)
        if not clan_data:
            raise HTTPException(status_code=404, detail="Clan not found")

        summary = {}

        # 1. Raid Medals (from latest capital raid season)
        try:
            raid_seasons = await coc_client.get_capital_raid_seasons(clan_tag, limit=2)
            # Find the latest completed raid (skip ongoing)
            latest_completed = None
            for season in raid_seasons:
                if season.get("state") != "ongoing":
                    latest_completed = season
                    break

            if latest_completed:
                # offensive_reward is per player (for 6 attacks), so multiply by 6 to get total clan medals
                offensive = latest_completed.get("offensiveReward", 0) * 6
                # defensive_reward is already the total clan defensive medals
                defensive = latest_completed.get("defensiveReward", 0)
                total_medals = offensive + defensive

                summary["raid_medals"] = {
                    "title": "Raid Medals",
                    "offensive": offensive,
                    "defensive": defensive,
                    "total": total_medals,
                    "display": f"{total_medals:,}",
                    "last_updated": latest_completed.get("endTime"),
                }
            else:
                summary["raid_medals"] = {
                    "title": "Raid Medals",
                    "offensive": 0,
                    "defensive": 0,
                    "total": 0,
                    "display": "0",
                }
        except Exception as e:
            logger.error(f"Error fetching raid medals: {e}")
            summary["raid_medals"] = {
                "title": "Raid Medals",
                "offensive": 0,
                "defensive": 0,
                "total": 0,
                "display": "0",
                "error": str(e),
            }

        # 2. CWL Medals (from war league)
        try:
            war_league = clan_data.get("warLeague", {})
            league_name = war_league.get("name", "Unranked")

            cwl_info = ResourceCalculator.get_cwl_medal_range(league_name)
            if cwl_info:
                summary["cwl_medals"] = {
                    "title": "CWL Medals",
                    "league": league_name,
                    "min_medals": cwl_info["min_medals"],
                    "max_medals": cwl_info["max_medals"],
                    "bonus_value": cwl_info["bonus_value"],
                    "bonuses": cwl_info["bonuses"],
                    "range_display": f"{cwl_info['min_medals']}-{cwl_info['max_medals']} (+ {cwl_info['bonus_value']})",
                }
            else:
                summary["cwl_medals"] = {
                    "title": "CWL Medals",
                    "league": league_name,
                    "range_display": "Unranked",
                }
        except Exception as e:
            logger.error(f"Error fetching CWL medals: {e}")
            summary["cwl_medals"] = {
                "title": "CWL Medals",
                "error": str(e),
            }

        # 3. Clan Games (from current/latest session)
        try:
            # Try to get current clan games session
            import httpx
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"http://localhost:8000/api/clan-games/session/current",
                    timeout=5.0
                )
                if response.status_code == 200:
                    games_data = response.json()
                    if games_data and games_data.get("session"):
                        session = games_data["session"]
                        # Calculate total points from all players
                        total_points = sum(
                            player.get("points_earned", 0)
                            for player in session.get("players", {}).values()
                        )

                        tier_info = ResourceCalculator.calculate_clan_games_tier(total_points)
                        summary["clan_games"] = {
                            "title": "Clan Games",
                            "current_tier": tier_info["current_tier"],
                            "max_tier": tier_info["max_tier"],
                            "current_points": tier_info["current_points"],
                            "tier_display": f"{tier_info['current_tier']}/{tier_info['max_tier']}",
                            "active": True,
                        }
                    else:
                        summary["clan_games"] = {
                            "title": "Clan Games",
                            "tier_display": "0/6",
                            "active": False,
                        }
                else:
                    summary["clan_games"] = {
                        "title": "Clan Games",
                        "tier_display": "0/6",
                        "active": False,
                    }
        except Exception as e:
            logger.error(f"Error fetching clan games: {e}")
            summary["clan_games"] = {
                "title": "Clan Games",
                "tier_display": "0/6",
                "error": str(e),
            }

        # 4. Ore Estimate (from war history)
        try:
            war_list = await storage_manager.list_wars(limit=30)

            wars = []
            for war_item in war_list:
                try:
                    # war_item has structure: {"id": "...", "data": {...}}
                    war_data = war_item.get("data", war_item)  # Handle both formats
                    if war_data:
                        # Determine if won
                        clan_stars = war_data.get("clan_stars", 0)
                        opponent_stars = war_data.get("opponent_stars", 0)
                        won = clan_stars > opponent_stars

                        wars.append({
                            "end_time": war_data.get("end_time"),
                            "won": won,
                        })
                except Exception as e:
                    logger.warning(f"Error processing war data: {e}")
                    continue

            ore_estimate = ResourceCalculator.calculate_rolling_ore_estimate(wars, days=30)
            avg_shiny = int(ore_estimate["avg_shiny_per_war"])
            avg_glowy = int(ore_estimate["avg_glowy_per_war"])
            avg_starry = int(ore_estimate["avg_starry_per_war"])

            summary["ore_estimate"] = {
                "title": "Estimated Ores",
                "shiny_ore": ore_estimate["shiny_ore"],
                "glowy_ore": ore_estimate["glowy_ore"],
                "starry_ore": ore_estimate["starry_ore"],
                "avg_shiny_per_war": avg_shiny,
                "avg_glowy_per_war": avg_glowy,
                "avg_starry_per_war": avg_starry,
                "war_count": ore_estimate["war_count"],
                "win_rate": ore_estimate["win_rate"],
                "display": f"{avg_shiny:,} / {avg_glowy} / {avg_starry}",
            }
        except Exception as e:
            logger.error(f"Error calculating ore estimate: {e}")
            summary["ore_estimate"] = {
                "title": "Estimated Ores",
                "display": "0 / 0 / 0",
                "error": str(e),
            }

        return summary

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching statistics summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/clan/{clan_tag}/statistics/raid-medals/history")
async def get_raid_medals_history(clan_tag: str, limit: int = 10):
    """
    Get historical raid medal data.

    Args:
        clan_tag: Clan tag (with or without #)
        limit: Number of seasons to retrieve (1-20, default 10)

    Returns:
        List of raid medal statistics by season
    """
    try:
        if limit < 1 or limit > 20:
            raise HTTPException(status_code=400, detail="Limit must be between 1 and 20")

        raid_seasons = await coc_client.get_capital_raid_seasons(clan_tag, limit)

        history = []
        for season in raid_seasons:
            # Skip ongoing raids - they don't have final medal counts yet
            if season.get("state") == "ongoing":
                continue

            # offensive_reward is per player (for 6 attacks), so multiply by 6 to get total clan medals
            offensive = season.get("offensiveReward", 0) * 6
            # defensive_reward is already the total clan defensive medals
            defensive = season.get("defensiveReward", 0)
            total_medals = offensive + defensive

            history.append({
                "end_time": season.get("endTime"),
                "start_time": season.get("startTime"),
                "offensive_medals": offensive,
                "defensive_medals": defensive,
                "total_medals": total_medals,
                "raids_completed": season.get("raidsCompleted", 0),
                "state": season.get("state", "ended"),
            })

        return {"items": history}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching raid medal history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/clan/{clan_tag}/statistics/clan-games/history")
async def get_clan_games_history(limit: int = 10):
    """
    Get historical clan games data.

    Args:
        limit: Number of past sessions to retrieve

    Returns:
        List of clan games sessions with tier achieved
    """
    try:
        # This would need to be implemented with persistent storage of completed sessions
        # For now, only return completed sessions (not active ones)
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"http://localhost:8000/api/clan-games/session/current",
                timeout=5.0
            )
            if response.status_code == 200:
                games_data = response.json()
                if games_data and games_data.get("session"):
                    session = games_data["session"]
                    # Only include in history if the session is completed (has end_time)
                    if session.get("end_time") and session.get("status") != "active":
                        # Calculate total points from all players
                        total_points = sum(
                            player.get("points_earned", 0)
                            for player in session.get("players", {}).values()
                        )

                        tier_info = ResourceCalculator.calculate_clan_games_tier(total_points)
                        return {
                            "items": [{
                                "start_time": session.get("start_time"),
                                "end_time": session.get("end_time"),
                                "total_points": total_points,
                                "tier_achieved": tier_info["current_tier"],
                                "max_tier": tier_info["max_tier"],
                            }]
                        }

        # No completed sessions - return empty array
        return {"items": []}

    except Exception as e:
        logger.error(f"Error fetching clan games history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/clan/{clan_tag}/statistics/ores/history")
async def get_ore_history(clan_tag: str, days: int = 30):
    """
    Get historical ore estimates.

    Args:
        clan_tag: Clan tag (with or without #)
        days: Number of days to look back (default 30)

    Returns:
        Daily ore estimates
    """
    try:
        # Calculate cutoff date
        cutoff_date = datetime.now() - timedelta(days=days)

        # Get wars from storage
        war_list = await storage_manager.list_wars(limit=100)
        history = []

        for war_item in war_list:
            try:
                # war_item has structure: {"id": "...", "data": {...}}
                war_data = war_item.get("data", war_item)  # Handle both formats
                if not war_data:
                    continue

                # Parse end time
                end_time_str = war_data.get("end_time")
                if not end_time_str:
                    continue

                end_time = datetime.fromisoformat(end_time_str.replace('Z', '+00:00'))

                if end_time >= cutoff_date:
                    clan_stars = war_data.get("clan_stars", 0)
                    opponent_stars = war_data.get("opponent_stars", 0)
                    won = clan_stars > opponent_stars

                    # Calculate ore by type
                    ore = ResourceCalculator.estimate_ore_from_war(won)

                    history.append({
                        "date": end_time.isoformat(),
                        "won": won,
                        "shiny_ore": ore["shiny_ore"],
                        "glowy_ore": ore["glowy_ore"],
                        "starry_ore": ore["starry_ore"],
                        "clan_stars": clan_stars,
                        "opponent_stars": opponent_stars,
                    })
            except Exception as e:
                logger.warning(f"Error processing war data: {e}")
                continue

        # Sort by date
        history.sort(key=lambda x: x["date"])

        return {"items": history}

    except Exception as e:
        logger.error(f"Error fetching ore history: {e}")
        raise HTTPException(status_code=500, detail=str(e))
