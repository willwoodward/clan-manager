"""Analytics routes - predictions, statistics, war history."""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
import sys
from pathlib import Path
import logging

# Add shared to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from shared.utils.storage import StorageManager
from ..services.predictor import PlayerPredictor
from ..services.coc_client import coc_client
from ..services.war_strategy import WarStrategyOptimizer, Member
from ..config import settings
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize storage and predictor
storage_manager = StorageManager(
    use_s3=settings.use_s3,
    s3_bucket=settings.s3_bucket,
    s3_prefix=settings.s3_prefix,
    s3_region=settings.s3_region,
    local_data_dir=settings.local_data_dir
)

predictor = PlayerPredictor(storage_manager, coc_client)
strategy_optimizer = WarStrategyOptimizer(predictor)


# Request models
class MemberInput(BaseModel):
    tag: str
    name: str
    town_hall: int
    heroes: Optional[List[int]] = []


class StrategyRequest(BaseModel):
    attackers: List[MemberInput]
    defenders: List[MemberInput]
    attacks_per_member: int = 2
    strategy_type: str = "balanced"


@router.get("/predict/{player_tag}")
async def predict_performance(
    player_tag: str,
    defender_th: Optional[int] = Query(None, description="Defender town hall level (optional if defender_tag is provided)"),
    defender_heroes: Optional[str] = Query(None, description="Comma-separated hero levels (e.g., '90,90,65,50')"),
    defender_tag: Optional[str] = Query(None, description="Defender player tag (will fetch TH and heroes from API)")
):
    """
    Predict player performance against a specific matchup.

    Args:
        player_tag: Player tag (with or without #)
        defender_th: Defender's town hall level (optional if defender_tag is provided)
        defender_heroes: Comma-separated list of defender hero levels
        defender_tag: Defender's player tag (will automatically fetch TH and heroes)

    Returns:
        Prediction with expected stars, destruction %, and confidence intervals
    """
    try:
        # Parse hero levels
        hero_levels = []
        if defender_heroes:
            hero_levels = [int(x.strip()) for x in defender_heroes.split(',') if x.strip()]

        prediction = await predictor.predict(
            player_tag=player_tag,
            defender_th=defender_th,
            defender_heroes=hero_levels if hero_levels else None,
            defender_tag=defender_tag
        )

        return prediction
    except Exception as e:
        logger.error(f"Error predicting for {player_tag}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats/player/{player_tag}")
async def get_player_stats(player_tag: str):
    """
    Get historical statistics for a player.

    Args:
        player_tag: Player tag (with or without #)

    Returns:
        Player attack statistics including avg stars, destruction %, etc.
    """
    try:
        stats = await predictor.get_player_stats(player_tag)
        return stats
    except Exception as e:
        logger.error(f"Error getting stats for {player_tag}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/wars/history")
async def get_war_history(
    limit: int = Query(20, ge=1, le=100, description="Number of wars to return"),
    offset: int = Query(0, ge=0, description="Number of wars to skip")
):
    """
    Get historical war data.

    Args:
        limit: Maximum number of wars to return (1-100)
        offset: Number of wars to skip (for pagination)

    Returns:
        List of historical wars
    """
    try:
        wars = await storage_manager.list_wars(limit=limit + offset)

        # Apply offset
        wars = wars[offset:offset + limit]

        return {
            "wars": wars,
            "count": len(wars),
            "limit": limit,
            "offset": offset
        }
    except Exception as e:
        logger.error(f"Error fetching war history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/priors")
async def get_priors():
    """
    Get TH-level priors used for predictions.

    Returns:
        TH-level statistics (avg destruction, stars, sample sizes)
    """
    try:
        priors = await predictor.get_priors()
        return priors
    except Exception as e:
        logger.error(f"Error getting priors: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/players")
async def get_known_players():
    """
    Get list of all known players from war history.

    Returns:
        List of players with their tags, names, and attack counts
    """
    try:
        # Load war data if not already loaded
        await predictor._load_war_data()

        # Build player list from predictor's stored data
        players = []
        for tag, name in predictor.player_names.items():
            attack_count = len(predictor.player_histories.get(tag, []))
            if attack_count > 0:  # Only include players with attack history
                players.append({
                    "tag": f"#{tag}",  # Add # prefix back
                    "name": name,
                    "attack_count": attack_count,
                    "is_clan_member": tag in predictor.clan_members
                })

        # Sort by name
        players.sort(key=lambda p: p["name"].lower())

        return {
            "players": players,
            "count": len(players)
        }
    except Exception as e:
        logger.error(f"Error getting known players: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/storage/info")
async def get_storage_info():
    """
    Get information about storage backend.

    Returns:
        Active storage backends and configuration
    """
    return storage_manager.get_backend_info()


@router.post("/war/strategy")
async def generate_war_strategy(request: StrategyRequest):
    """
    Generate optimal war attack strategy.

    Args:
        request: Strategy request with attackers, defenders, and parameters

    Returns:
        Optimal attack assignments with expected performance
    """
    try:
        # Convert input to Member objects
        attackers = [
            Member(
                tag=a.tag,
                name=a.name,
                town_hall=a.town_hall,
                heroes=a.heroes or []
            )
            for a in request.attackers
        ]

        defenders = [
            Member(
                tag=d.tag,
                name=d.name,
                town_hall=d.town_hall,
                heroes=d.heroes or []
            )
            for d in request.defenders
        ]

        # Generate strategy
        strategy = await strategy_optimizer.generate_strategy(
            attackers=attackers,
            defenders=defenders,
            attacks_per_member=request.attacks_per_member,
            strategy_type=request.strategy_type
        )

        return strategy
    except Exception as e:
        logger.error(f"Error generating war strategy: {e}")
        raise HTTPException(status_code=500, detail=str(e))
