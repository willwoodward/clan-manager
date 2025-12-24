"""Player activity API endpoints."""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any, Optional
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

# Import activity tracker directly
import importlib.util
spec = importlib.util.spec_from_file_location(
    "activity_tracker",
    Path(__file__).parent.parent.parent / "shared" / "utils" / "activity_tracker.py"
)
activity_tracker_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(activity_tracker_module)

ActivityTracker = activity_tracker_module.ActivityTracker

router = APIRouter()

# Initialize activity tracker
project_root = Path(__file__).parent.parent.parent
activity_tracker = ActivityTracker(data_dir=str(project_root / "data" / "activity"))


@router.get("/players/{player_tag}/activity")
async def get_player_activity(player_tag: str) -> Dict[str, Any]:
    """Get last activity for a specific player.

    Args:
        player_tag: Player tag (with or without # prefix)

    Returns:
        Player activity data including last active timestamp and activity type
    """
    # Ensure player tag has # prefix
    if not player_tag.startswith("#"):
        player_tag = f"#{player_tag}"

    activity = activity_tracker.get_player_activity(player_tag)

    if not activity:
        raise HTTPException(
            status_code=404,
            detail=f"No activity found for player {player_tag}"
        )

    return activity


@router.get("/players/activity")
async def get_all_player_activities() -> Dict[str, Any]:
    """Get activity data for all tracked players.

    Returns:
        Dictionary of all player activities keyed by player tag
    """
    activities = activity_tracker.get_all_activities()
    return {
        "count": len(activities),
        "activities": activities
    }


@router.get("/players/{player_tag}/activity/history")
async def get_player_activity_history(player_tag: str, days: int = 30) -> Dict[str, Any]:
    """Get daily activity history for a player.

    Args:
        player_tag: Player tag (with or without # prefix)
        days: Number of days of history to return (default: 30)

    Returns:
        List of daily activity data with scores, sorted by date
    """
    # Ensure player tag has # prefix
    if not player_tag.startswith("#"):
        player_tag = f"#{player_tag}"

    history = activity_tracker.get_player_activity_history(player_tag, days=days)

    return {
        "player_tag": player_tag,
        "days": days,
        "count": len(history),
        "history": history
    }


@router.get("/players/activity/inactive")
async def get_inactive_players(hours: int = 24) -> Dict[str, Any]:
    """Get players who haven't been active in the specified hours.

    Args:
        hours: Number of hours to consider inactive (default: 24)

    Returns:
        List of inactive players sorted by most inactive first
    """
    inactive_players = activity_tracker.get_inactive_players(hours=hours)

    return {
        "count": len(inactive_players),
        "hours_threshold": hours,
        "inactive_players": inactive_players
    }
