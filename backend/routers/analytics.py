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


class LineupOptimizeRequest(BaseModel):
    opted_in_tags: List[str]  # Player tags who have opted in
    war_size: Optional[int] = None  # If None, maximize from pool
    risk_tolerance: float = 0.5  # 0 = Perfect War (pessimistic), 1 = Max Participation (optimistic)
    suggest_additional: bool = False  # Include "Consider Adding" section


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


@router.post("/lineup/optimize")
async def optimize_lineup(request: LineupOptimizeRequest):
    """
    Optimize war lineup from opted-in players.

    Calculates strength scores based on absolute performance metrics
    (3-star rates, destruction consistency) and returns recommended
    lineup with excluded players and reasons.

    Args:
        request: Lineup optimization request with opted-in players and parameters

    Returns:
        Recommended lineup, excluded players with reasons, and optional suggestions
    """
    try:
        # Valid war sizes in Clash of Clans
        valid_sizes = [5, 10, 15, 20, 25, 30, 40, 50]

        # Get strength scores for opted-in players
        opted_scores = await predictor.get_lineup_strength_scores(
            request.opted_in_tags,
            request.risk_tolerance
        )

        # Determine war size
        if request.war_size:
            target_size = request.war_size
        else:
            # Find largest valid size <= opted_in count
            target_size = max(
                [s for s in valid_sizes if s <= len(opted_scores)],
                default=5
            )

        # Split into recommended vs excluded
        recommended = opted_scores[:target_size]
        excluded = opted_scores[target_size:]

        # Add position assignments
        critical_threshold = int(target_size * 0.4)  # Top 40% are critical
        for i, player in enumerate(recommended):
            player['position'] = i + 1
            player['is_critical_position'] = i < critical_threshold

        # Generate exclusion reasons
        threshold_score = recommended[-1]['strength_score'] if recommended else 0
        for player in excluded:
            player['reason'] = _generate_exclusion_reason(player, threshold_score)

        # Find additional players to suggest if requested
        consider_adding = []
        if request.suggest_additional:
            try:
                # Get current clan members
                clan_data = await coc_client.get_clan(settings.clan_tag)
                if clan_data:
                    member_list = clan_data.get("memberList", [])
                    opted_in_normalized = {
                        tag.upper().replace('#', '')
                        for tag in request.opted_in_tags
                    }

                    # Find members not opted in
                    non_opted_tags = [
                        m['tag'] for m in member_list
                        if m['tag'].upper().replace('#', '') not in opted_in_normalized
                    ]

                    if non_opted_tags:
                        # Get their strength scores
                        non_opted_scores = await predictor.get_lineup_strength_scores(
                            non_opted_tags,
                            request.risk_tolerance
                        )

                        # Find players who would improve the lineup
                        for player in non_opted_scores:
                            if player['strength_score'] > threshold_score and player['has_data']:
                                player['priority_reason'] = _generate_suggestion_reason(
                                    player, threshold_score
                                )
                                consider_adding.append(player)

                        # Limit to top 5 suggestions
                        consider_adding = consider_adding[:5]
            except Exception as e:
                logger.warning(f"Could not fetch clan members for suggestions: {e}")

        # Calculate summary statistics
        if recommended:
            avg_score = sum(p['strength_score'] for p in recommended) / len(recommended)
            avg_3star = sum(p['overall_3star_rate'] for p in recommended) / len(recommended)
            high_reliability = sum(1 for p in recommended if p['reliability'] == 'high')

            if high_reliability >= len(recommended) * 0.6:
                confidence_level = "high"
            elif high_reliability >= len(recommended) * 0.3:
                confidence_level = "medium"
            else:
                confidence_level = "low"
        else:
            avg_score = 0
            avg_3star = 0
            confidence_level = "none"

        return {
            "recommended_lineup": recommended,
            "excluded": excluded,
            "consider_adding": consider_adding,
            "summary": {
                "lineup_size": len(recommended),
                "war_size": target_size,
                "avg_strength_score": round(avg_score, 1),
                "avg_3star_rate": round(avg_3star, 1),
                "confidence_level": confidence_level,
                "opted_in_count": len(request.opted_in_tags),
                "excluded_count": len(excluded)
            }
        }
    except Exception as e:
        logger.error(f"Error optimizing lineup: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def _generate_exclusion_reason(player: dict, threshold_score: float) -> str:
    """Generate human-readable exclusion reason."""
    if player['sample_size'] == 0:
        return "No war attack history - need participation data for reliable predictions"

    if player['sample_size'] < 3:
        return f"Limited data ({player['sample_size']} attacks) - need more war participation"

    overall_rate = player.get('overall_3star_rate', 0)
    if overall_rate < 30:
        return f"Low 3-star rate ({overall_rate:.0f}%) - below recommended threshold"

    if player['reliability'] == 'low':
        score_gap = threshold_score - player['strength_score']
        return f"Score {score_gap:.1f} points below cutoff with low confidence"

    score_gap = threshold_score - player['strength_score']
    return f"Score ({player['strength_score']:.1f}) is {score_gap:.1f} points below lineup cutoff ({threshold_score:.1f})"


def _generate_suggestion_reason(player: dict, threshold_score: float) -> str:
    """Generate reason why this player should be asked to opt in."""
    score_diff = player['strength_score'] - threshold_score
    overall_rate = player.get('overall_3star_rate', 0)

    if overall_rate >= 70:
        return f"High performer ({overall_rate:.0f}% 3-star rate) - {score_diff:.1f} points above current cutoff"

    if player['reliability'] == 'high':
        return f"Proven reliable attacker ({player['sample_size']} attacks) - would strengthen lineup"

    return f"Score {score_diff:.1f} points above current lineup threshold"
