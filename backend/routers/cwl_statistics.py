"""CWL (Clan War League) statistics API."""

import sys
from pathlib import Path
from fastapi import APIRouter, HTTPException
from typing import Optional
import logging

# Add shared to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from shared.utils.storage import StorageManager
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


@router.get("/cwl/history")
async def get_cwl_history(limit: int = 12):
    """
    Get historical CWL seasons.

    Args:
        limit: Number of seasons to retrieve (default 12)

    Returns:
        List of CWL seasons with league progression
    """
    try:
        seasons = await storage_manager.list_cwl_seasons(limit=limit)

        history = []
        for season_item in seasons:
            season_data = season_item.get("data", season_item)
            if not season_data:
                continue

            history.append({
                "season_id": season_data.get("season_id"),
                "league_start": season_data.get("league_start"),
                "league_end": season_data.get("league_end"),
                "wars_won": season_data.get("wars_won", 0),
                "wars_lost": season_data.get("wars_lost", 0),
                "wars_tied": season_data.get("wars_tied", 0),
                "total_stars": season_data.get("total_stars", 0),
                "total_destruction": season_data.get("total_destruction", 0),
                "promoted": season_data.get("promoted", False),
                "demoted": season_data.get("demoted", False),
                "status": season_data.get("status", "unknown"),
                "end_time": season_data.get("end_time"),
            })

        return {"items": history}

    except Exception as e:
        logger.error(f"Error fetching CWL history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cwl/season/{season_id}")
async def get_cwl_season_details(season_id: str):
    """
    Get detailed stats for a specific CWL season.

    Args:
        season_id: Season ID (format: YYYY-MM)

    Returns:
        Detailed season data including all wars
    """
    try:
        season_data = await storage_manager.get_cwl_season(season_id)

        if not season_data:
            raise HTTPException(status_code=404, detail=f"Season {season_id} not found")

        # Get all wars for this season
        wars = await storage_manager.list_cwl_wars(season_id=season_id, limit=7)

        war_summaries = []
        for war_item in wars:
            war_data = war_item.get("data", war_item)
            if not war_data:
                continue

            clan = war_data.get("clan", {})
            opponent = war_data.get("opponent", {})

            war_summaries.append({
                "war_tag": war_data.get("warTag"),
                "start_time": war_data.get("startTime"),
                "end_time": war_data.get("endTime"),
                "state": war_data.get("state"),
                "clan_name": clan.get("name"),
                "clan_stars": clan.get("stars", 0),
                "clan_destruction": clan.get("destructionPercentage", 0),
                "opponent_name": opponent.get("name"),
                "opponent_stars": opponent.get("stars", 0),
                "opponent_destruction": opponent.get("destructionPercentage", 0),
                "result": "win" if clan.get("stars", 0) > opponent.get("stars", 0) else ("loss" if clan.get("stars", 0) < opponent.get("stars", 0) else "tie"),
            })

        return {
            "season": season_data,
            "wars": war_summaries,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching CWL season {season_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cwl/war/{war_tag}")
async def get_cwl_war_details(war_tag: str):
    """
    Get detailed stats for a specific CWL war including all attacks.

    Args:
        war_tag: War tag

    Returns:
        Full war data with player-level attack details
    """
    try:
        war_data = await storage_manager.get_cwl_war(war_tag)

        if not war_data:
            raise HTTPException(status_code=404, detail=f"War {war_tag} not found")

        return war_data

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching CWL war {war_tag}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cwl/current")
async def get_current_cwl_season():
    """
    Get the current/most recent CWL season.

    Returns:
        Current season data with all wars
    """
    try:
        seasons = await storage_manager.list_cwl_seasons(limit=1)

        if not seasons:
            return {"message": "No CWL data available"}

        latest_season = seasons[0].get("data", seasons[0])
        season_id = latest_season.get("season_id")

        # Get all wars for this season
        wars = await storage_manager.list_cwl_wars(season_id=season_id, limit=7)

        war_summaries = []
        for war_item in wars:
            war_data = war_item.get("data", war_item)
            if not war_data:
                continue

            clan = war_data.get("clan", {})
            opponent = war_data.get("opponent", {})

            war_summaries.append({
                "war_tag": war_data.get("warTag"),
                "start_time": war_data.get("startTime"),
                "end_time": war_data.get("endTime"),
                "state": war_data.get("state"),
                "clan_name": clan.get("name"),
                "clan_stars": clan.get("stars", 0),
                "clan_destruction": clan.get("destructionPercentage", 0),
                "opponent_name": opponent.get("name"),
                "opponent_stars": opponent.get("stars", 0),
                "opponent_destruction": opponent.get("destructionPercentage", 0),
                "result": "win" if clan.get("stars", 0) > opponent.get("stars", 0) else ("loss" if clan.get("stars", 0) < opponent.get("stars", 0) else "tie"),
            })

        return {
            "season": latest_season,
            "wars": war_summaries,
        }

    except Exception as e:
        logger.error(f"Error fetching current CWL season: {e}")
        raise HTTPException(status_code=500, detail=str(e))
