"""Clan games API endpoints."""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

# Import clan games storage directly
import importlib.util
spec = importlib.util.spec_from_file_location(
    "clan_games_storage",
    Path(__file__).parent.parent.parent / "shared" / "utils" / "clan_games_storage.py"
)
clan_games_storage_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(clan_games_storage_module)

ClanGamesStorage = clan_games_storage_module.ClanGamesStorage

router = APIRouter()

# Initialize clan games storage
project_root = Path(__file__).parent.parent.parent
clan_games_storage = ClanGamesStorage(data_dir=str(project_root / "data" / "clan_games"))


class StartSessionRequest(BaseModel):
    initial_standings: Optional[Dict[str, int]] = None


@router.post("/session/start")
async def start_clan_games_session(request: StartSessionRequest) -> Dict[str, Any]:
    """Start a new clan games session.

    Args:
        request: Optional initial standings (player_tag -> total_points)

    Returns:
        The created session
    """
    try:
        session = clan_games_storage.start_session(
            initial_standings=request.initial_standings
        )
        return {"success": True, "session": session}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error starting session: {str(e)}")


@router.post("/session/end")
async def end_clan_games_session() -> Dict[str, Any]:
    """End the current clan games session.

    Returns:
        The completed session with summary and leaderboard
    """
    # Get clan size for participation rate calculation
    from backend.config import settings
    import coc

    try:
        # Get current clan size
        client = coc.Client()
        await client.login(settings.coc_email, settings.coc_password)
        clan = await client.get_clan(settings.clan_tag)
        clan_size = clan.member_count
        await client.close()
    except Exception as e:
        # Fallback if we can't get clan size
        clan_size = None

    session = clan_games_storage.end_session(clan_size=clan_size)
    if not session:
        raise HTTPException(status_code=404, detail="No active session to end")

    return {"success": True, "session": session}


@router.get("/session/current")
async def get_current_session() -> Dict[str, Any]:
    """Get the current active clan games session.

    Returns:
        The current session or None
    """
    session = clan_games_storage.get_current_session()
    return {"session": session}


@router.get("/leaderboard")
async def get_clan_games_leaderboard() -> Dict[str, Any]:
    """Get the leaderboard for the current clan games session.

    Returns:
        List of players sorted by points earned
    """
    leaderboard = clan_games_storage.get_session_leaderboard()
    return {
        "leaderboard": leaderboard,
        "count": len(leaderboard)
    }


@router.get("/sessions/history")
async def get_clan_games_history() -> Dict[str, Any]:
    """Get all historical clan games sessions.

    Returns:
        List of completed sessions
    """
    sessions = clan_games_storage.get_all_sessions()
    return {
        "sessions": sessions,
        "count": len(sessions)
    }


class ManualUpdateRequest(BaseModel):
    player_tag: str
    start_points: int


@router.post("/session/manual-update")
async def manual_update_player(request: ManualUpdateRequest) -> Dict[str, Any]:
    """Manually update a player's starting points in the current session.

    Args:
        request: player_tag and new start_points

    Returns:
        Success message
    """
    session = clan_games_storage.get_current_session()
    if not session:
        raise HTTPException(status_code=404, detail="No active session")

    if request.player_tag not in session["players"]:
        raise HTTPException(status_code=404, detail=f"Player {request.player_tag} not found in session")

    # Update the player's start_points and recalculate earned points
    player = session["players"][request.player_tag]
    player["start_points"] = request.start_points
    player["points_earned"] = player["current_points"] - request.start_points

    # Save updated session
    clan_games_storage._save_current_session(session)

    return {
        "success": True,
        "message": f"Updated {player['player_name']}: start={request.start_points}, earned={player['points_earned']}"
    }
