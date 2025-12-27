"""Utilities for calculating clan resources (raid medals, CWL medals, ores, etc)."""

import math
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta


class ResourceCalculator:
    """Calculate various clan resources based on game mechanics."""

    # District Hall level to raid medals mapping
    DISTRICT_MEDALS = {
        1: 135,
        2: 225,
        3: 350,
        4: 405,
        5: 460,
    }

    # Capital Hall level to raid medals mapping
    CAPITAL_MEDALS = {
        2: 180,
        3: 360,
        4: 585,
        5: 810,
        6: 1115,
        7: 1240,
        8: 1260,
        9: 1375,
        10: 1450,
    }

    # CWL League medal rewards: league -> [1st, 2nd, 3rd, 4th, 5th, 6th, 7th, 8th, bonuses, bonus_value]
    CWL_MEDALS = {
        "Bronze League III": [34, 32, 30, 28, 26, 24, 22, 20, 1, 35],
        "Bronze League II": [46, 44, 42, 40, 38, 36, 34, 32, 1, 35],
        "Bronze League I": [58, 56, 54, 52, 50, 48, 46, 44, 1, 35],
        "Silver League III": [76, 73, 70, 67, 64, 61, 58, 55, 1, 40],
        "Silver League II": [94, 91, 88, 85, 82, 79, 76, 73, 1, 40],
        "Silver League I": [112, 109, 106, 103, 100, 97, 94, 91, 1, 45],
        "Gold League III": [136, 132, 128, 124, 120, 116, 112, 108, 2, 50],
        "Gold League II": [160, 156, 152, 148, 144, 140, 136, 132, 2, 55],
        "Gold League I": [184, 180, 176, 172, 168, 164, 160, 156, 2, 60],
        "Crystal League III": [214, 209, 204, 199, 194, 189, 184, 179, 2, 65],
        "Crystal League II": [244, 239, 234, 229, 224, 219, 214, 209, 2, 70],
        "Crystal League I": [274, 269, 264, 259, 254, 249, 244, 239, 2, 75],
        "Master League III": [310, 304, 298, 292, 286, 280, 274, 268, 3, 80],
        "Master League II": [346, 340, 334, 328, 322, 316, 310, 304, 3, 85],
        "Master League I": [382, 376, 370, 364, 358, 352, 346, 340, 3, 90],
        "Champion League III": [424, 417, 410, 403, 396, 389, 382, 375, 4, 95],
        "Champion League II": [466, 459, 452, 445, 438, 431, 424, 417, 4, 100],
        "Champion League I": [508, 501, 494, 487, 480, 473, 466, 459, 4, 105],
    }

    # Clan Games tier thresholds
    CLAN_GAMES_TIERS = [3000, 7500, 12000, 18000, 30000, 50000]

    @staticmethod
    def calculate_defensive_raid_medals(max_troop_housing_destroyed: int) -> int:
        """
        Calculate defensive raid medals.

        Args:
            max_troop_housing_destroyed: Maximum troop housing space destroyed across all enemy attacks

        Returns:
            Defensive raid medals earned
        """
        return math.ceil(max_troop_housing_destroyed / 25)

    @staticmethod
    def calculate_offensive_raid_medals(
        districts_completed: List[int],
        capital_peak_level: Optional[int] = None,
        total_clan_attacks: int = 1
    ) -> Tuple[int, int]:
        """
        Calculate offensive raid medals for the clan.

        Args:
            districts_completed: List of district hall levels completed
            capital_peak_level: Capital hall level completed (if any)
            total_clan_attacks: Total number of attacks by the clan

        Returns:
            Tuple of (total_clan_medals, medals_per_attack)
        """
        total_medals = 0

        # Add district medals
        for dh_level in districts_completed:
            total_medals += ResourceCalculator.DISTRICT_MEDALS.get(dh_level, 0)

        # Add capital peak medals
        if capital_peak_level:
            total_medals += ResourceCalculator.CAPITAL_MEDALS.get(capital_peak_level, 0)

        # Calculate medals per attack (rounded up)
        if total_clan_attacks == 0:
            return total_medals, 0

        medals_per_attack = math.ceil(total_medals / total_clan_attacks)
        return total_medals, medals_per_attack

    @staticmethod
    def calculate_player_offensive_medals(medals_per_attack: int, player_attacks: int) -> int:
        """
        Calculate offensive raid medals for a specific player.

        Args:
            medals_per_attack: Medals awarded per attack (from clan calculation)
            player_attacks: Number of attacks the player performed

        Returns:
            Player's offensive raid medals (capped at 6 attacks)
        """
        return medals_per_attack * min(player_attacks, 6)

    @staticmethod
    def get_cwl_medal_range(league_name: str) -> Optional[Dict[str, any]]:
        """
        Get CWL medal information for a given league.

        Args:
            league_name: Name of the war league

        Returns:
            Dict with min_medals, max_medals, bonuses, bonus_value or None if not found
        """
        medals = ResourceCalculator.CWL_MEDALS.get(league_name)
        if not medals:
            return None

        return {
            "league": league_name,
            "min_medals": medals[7],  # 8th place
            "max_medals": medals[0],  # 1st place
            "bonuses": medals[8],
            "bonus_value": medals[9],
            "position_rewards": medals[:8],  # All 8 positions
        }

    @staticmethod
    def calculate_clan_games_tier(total_points: int) -> Dict[str, any]:
        """
        Calculate clan games tier achieved.

        Args:
            total_points: Total clan points earned

        Returns:
            Dict with current_tier, max_tier, current_points, next_tier_points
        """
        current_tier = 0
        next_tier_points = ResourceCalculator.CLAN_GAMES_TIERS[0]

        for i, threshold in enumerate(ResourceCalculator.CLAN_GAMES_TIERS):
            if total_points >= threshold:
                current_tier = i + 1
            else:
                next_tier_points = threshold
                break

        # If all tiers completed
        if current_tier == len(ResourceCalculator.CLAN_GAMES_TIERS):
            next_tier_points = None

        return {
            "current_tier": current_tier,
            "max_tier": len(ResourceCalculator.CLAN_GAMES_TIERS),
            "current_points": total_points,
            "next_tier_points": next_tier_points,
            "tier_thresholds": ResourceCalculator.CLAN_GAMES_TIERS,
        }

    @staticmethod
    def estimate_ore_from_war(
        won: bool,
        attacks: int = 2
    ) -> Dict[str, int]:
        """
        Estimate ore earned from a war based on attacking max TH.

        Per attack on max TH: 1110 shiny, 39 glowy, 6 starry ore
        Win: 100% × attacks
        Loss/Draw: 50% × attacks

        Args:
            won: Whether the war was won
            attacks: Number of attacks (default 2)

        Returns:
            Dict with shiny_ore, glowy_ore, starry_ore
        """
        # Base ore per attack on max TH
        base_shiny = 1110
        base_glowy = 39
        base_starry = 6

        # Calculate total based on win/loss and number of attacks
        multiplier = 1.0 if won else 0.5

        return {
            "shiny_ore": int(base_shiny * attacks * multiplier),
            "glowy_ore": int(base_glowy * attacks * multiplier),
            "starry_ore": int(base_starry * attacks * multiplier),
        }

    @staticmethod
    def calculate_rolling_ore_estimate(
        wars: List[Dict],
        days: int = 30
    ) -> Dict[str, any]:
        """
        Calculate rolling ore estimate over a time period.

        Args:
            wars: List of war dictionaries with 'end_time' and 'won' keys
            days: Number of days to calculate over (default 30)

        Returns:
            Dict with shiny_ore, glowy_ore, starry_ore, war_count, win_rate
        """
        cutoff_date = datetime.now() - timedelta(days=days)
        total_shiny = 0
        total_glowy = 0
        total_starry = 0
        war_count = 0
        wins = 0

        for war in wars:
            # Parse end_time (assume ISO format)
            if isinstance(war.get('end_time'), str):
                end_time = datetime.fromisoformat(war['end_time'].replace('Z', '+00:00'))
            else:
                end_time = war.get('end_time')

            if end_time and end_time >= cutoff_date:
                war_count += 1
                won = war.get('won', False)
                if won:
                    wins += 1

                ore = ResourceCalculator.estimate_ore_from_war(won)
                total_shiny += ore["shiny_ore"]
                total_glowy += ore["glowy_ore"]
                total_starry += ore["starry_ore"]

        win_rate = (wins / war_count * 100) if war_count > 0 else 0
        avg_shiny = (total_shiny / war_count) if war_count > 0 else 0
        avg_glowy = (total_glowy / war_count) if war_count > 0 else 0
        avg_starry = (total_starry / war_count) if war_count > 0 else 0

        return {
            "shiny_ore": total_shiny,
            "glowy_ore": total_glowy,
            "starry_ore": total_starry,
            "war_count": war_count,
            "wins": wins,
            "win_rate": round(win_rate, 1),
            "avg_shiny_per_war": round(avg_shiny, 1),
            "avg_glowy_per_war": round(avg_glowy, 1),
            "avg_starry_per_war": round(avg_starry, 1),
            "days": days,
        }
