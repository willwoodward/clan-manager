"""Player performance prediction service."""

import sys
from pathlib import Path
from collections import defaultdict
from typing import Optional, Dict, List, TYPE_CHECKING
import logging

# Add shared to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from shared.utils.storage import StorageManager
from ..config import settings

if TYPE_CHECKING:
    from .coc_client import BackendCoCClient

logger = logging.getLogger(__name__)


class PlayerPredictor:
    """Predicts player war performance using Bayesian hierarchical modeling."""

    def __init__(self, storage_manager: StorageManager, coc_client: Optional['BackendCoCClient'] = None):
        self.storage = storage_manager
        self.coc_client = coc_client
        self.player_histories = defaultdict(list)
        self.player_names = {}
        self.clan_members = set()
        self.th_priors = {}
        self.clan_tag = settings.clan_tag
        self._loaded = False

    def _normalize_tag(self, tag: str) -> str:
        """Normalize player tag to remove # and uppercase."""
        if not tag:
            return tag
        tag = tag.upper().strip()
        if tag.startswith('#'):
            tag = tag[1:]
        return tag

    async def _load_war_data(self):
        """Load all war data from storage."""
        if self._loaded:
            return

        logger.info("Loading war history for predictions...")

        # Load regular wars
        wars = await self.storage.list_wars(limit=1000)
        regular_attacks = 0

        for war_entry in wars:
            war = war_entry["data"]

            # Identify clan members (with normalized tags)
            for member in war.get("clan_members", []):
                normalized_tag = self._normalize_tag(member["tag"])
                self.clan_members.add(normalized_tag)
                self.player_names[normalized_tag] = member["name"]

            # Create lookup for ALL player details (with normalized tags)
            players = {}
            for member in war.get("clan_members", []) + war.get("opponent_members", []):
                normalized_tag = self._normalize_tag(member["tag"])
                players[normalized_tag] = member

            # Process each attack - ONLY from clan members
            for attack in war.get("attacks", []):
                attacker_tag = self._normalize_tag(attack["attacker_tag"])
                defender_tag = self._normalize_tag(attack["defender_tag"])

                if attacker_tag not in self.clan_members:
                    continue

                attacker = players.get(attacker_tag)
                defender = players.get(defender_tag)

                if not attacker or not defender:
                    continue

                record = {
                    "stars": attack["stars"],
                    "destruction": attack["destruction"],
                    "attacker_th": attacker["town_hall"],
                    "defender_th": defender["town_hall"],
                    "attacker_heroes": [h["level"] for h in attacker.get("heroes", [])],
                    "defender_heroes": [h["level"] for h in defender.get("heroes", [])],
                    "date": war.get("start_time", "")
                }

                self.player_histories[attacker_tag].append(record)
                regular_attacks += 1

        logger.info(f"Loaded {len(wars)} regular wars with {regular_attacks} attacks")

        # Load CWL wars
        cwl_wars = await self.storage.list_cwl_wars(limit=1000)
        cwl_attacks = 0

        for war_entry in cwl_wars:
            war = war_entry["data"]

            # CWL wars have a different structure with clan/opponent objects
            clan_data = war.get("clan", {})
            opponent_data = war.get("opponent", {})

            # Identify clan members from CWL war (check if this war involves our clan)
            our_clan_tag = self._normalize_tag(self.clan_tag)
            clan_tag_in_war = self._normalize_tag(clan_data.get("tag", ""))

            # Determine which side is our clan
            if clan_tag_in_war == our_clan_tag:
                our_members = clan_data.get("members", [])
                opponent_members = opponent_data.get("members", [])
            else:
                # This CWL war might not involve our clan, skip it
                continue

            # Build player lookup (both clan and opponent)
            players = {}

            # Process our clan members
            for member in our_members:
                normalized_tag = self._normalize_tag(member.get("tag", ""))
                self.clan_members.add(normalized_tag)
                self.player_names[normalized_tag] = member.get("name", "")
                players[normalized_tag] = {
                    "town_hall": member.get("townhallLevel", 0),
                    "heroes": []  # CWL war data doesn't include hero info
                }

            # Process opponent members
            for member in opponent_members:
                normalized_tag = self._normalize_tag(member.get("tag", ""))
                players[normalized_tag] = {
                    "town_hall": member.get("townhallLevel", 0),
                    "heroes": []  # CWL war data doesn't include hero info
                }

            # Process attacks from our clan members
            # In CWL wars, attacks are nested within each member
            for member in our_members:
                member_tag = self._normalize_tag(member.get("tag", ""))

                for attack in member.get("attacks", []):
                    defender_tag = self._normalize_tag(attack.get("defenderTag", ""))
                    defender = players.get(defender_tag)
                    attacker = players.get(member_tag)

                    if not attacker or not defender:
                        continue

                    record = {
                        "stars": attack.get("stars", 0),
                        "destruction": attack.get("destructionPercentage", 0),
                        "attacker_th": attacker["town_hall"],
                        "defender_th": defender["town_hall"],
                        "attacker_heroes": attacker.get("heroes", []),
                        "defender_heroes": defender.get("heroes", []),
                        "date": war.get("startTime", "")
                    }

                    self.player_histories[member_tag].append(record)
                    cwl_attacks += 1

        logger.info(f"Loaded {len(cwl_wars)} CWL wars with {cwl_attacks} attacks")

        # Compute TH-level priors
        self._compute_priors()
        self._loaded = True
        logger.info(f"Loaded {len(self.player_histories)} players, {sum(len(h) for h in self.player_histories.values())} total attacks")

    def _compute_priors(self):
        """Compute TH-level priors from all attacks (destruction-based)."""
        th_attacks = defaultdict(list)

        for player_tag, attacks in self.player_histories.items():
            for attack in attacks:
                th_attacks[attack["attacker_th"]].append(attack)

        for th, attacks in th_attacks.items():
            destructions = [a["destruction"] for a in attacks]
            avg_destruction = sum(destructions) / len(destructions)
            variance = sum((d - avg_destruction) ** 2 for d in destructions) / len(destructions)
            std_dev = variance ** 0.5

            self.th_priors[th] = {
                "avg_destruction": avg_destruction,
                "std_destruction": std_dev,
                "sample_size": len(attacks),
                "avg_stars": sum(a["stars"] for a in attacks) / len(attacks)
            }

        logger.info(f"Computed priors for TH levels: {sorted(self.th_priors.keys())}")

    def _matchup_difficulty(
        self,
        att_th: int,
        att_heroes: List[int],
        def_th: int,
        def_heroes: List[int]
    ) -> float:
        """Calculate matchup difficulty multiplier with continuous scaling."""
        th_diff = att_th - def_th

        # Continuous scaling function for TH differences
        if th_diff >= 2:
            # Attacking up: 1.25 at +2, scales up by 0.15 per additional TH
            base = 1.25 + (th_diff - 2) * 0.15
        elif th_diff == 1:
            base = 1.1
        elif th_diff == 0:
            base = 1.0
        elif th_diff == -1:
            base = 0.95
        elif th_diff <= -2:
            # Attacking down: 0.3 at -2, scales down by 0.1 per additional TH
            # but never goes below 0.1
            base = max(0.1, 0.3 + (th_diff + 2) * 0.1)
        else:
            base = 1.0

        # Hero adjustment
        if att_heroes and def_heroes:
            hero_diff = sum(att_heroes) - sum(def_heroes)
            hero_adjustment = 1.0 + (hero_diff / 400)
            hero_adjustment = max(0.75, min(1.25, hero_adjustment))
        else:
            hero_adjustment = 1.0

        return base * hero_adjustment

    def _destruction_to_stars(self, dest: float) -> float:
        """Convert destruction % to expected stars."""
        if dest >= 100:
            return 3.0
        elif dest >= 50:
            return 2.0 + (dest - 50) / 50
        elif dest > 0:
            return (dest / 50) * 2.0
        else:
            return 0.0

    async def predict(
        self,
        player_tag: str,
        defender_th: Optional[int] = None,
        defender_heroes: Optional[List[int]] = None,
        defender_tag: Optional[str] = None
    ) -> Dict:
        """Predict player performance for a given matchup.

        Args:
            player_tag: Tag of the attacking player
            defender_th: Defender's town hall level (optional if defender_tag is provided)
            defender_heroes: Defender's hero levels (optional if defender_tag is provided)
            defender_tag: Tag of the defending player (will fetch TH and heroes from API)
        """
        await self._load_war_data()

        # Normalize tags
        player_tag = self._normalize_tag(player_tag)
        if defender_tag:
            defender_tag = self._normalize_tag(defender_tag)

        # If defender_tag is provided, fetch defender info from API
        if defender_tag:
            if not self.coc_client:
                return {
                    "player_tag": player_tag,
                    "player_name": self.player_names.get(player_tag, player_tag),
                    "error": "Cannot fetch defender data: CoC client not available",
                    "expected_stars": 0,
                    "expected_destruction": 0,
                    "sample_size": 0
                }

            try:
                defender_data = await self.coc_client.get_player(defender_tag)
                if not defender_data:
                    return {
                        "player_tag": player_tag,
                        "player_name": self.player_names.get(player_tag, player_tag),
                        "error": f"Could not fetch data for defender {defender_tag}",
                        "expected_stars": 0,
                        "expected_destruction": 0,
                        "sample_size": 0
                    }

                defender_th = defender_data.get("townHallLevel", 0)
                defender_heroes = [h["level"] for h in defender_data.get("heroes", [])]

                logger.info(f"Fetched defender {defender_tag}: TH{defender_th}, heroes: {defender_heroes}")
            except Exception as e:
                logger.error(f"Error fetching defender data for {defender_tag}: {e}")
                return {
                    "player_tag": player_tag,
                    "player_name": self.player_names.get(player_tag, player_tag),
                    "error": f"Error fetching defender data: {str(e)}",
                    "expected_stars": 0,
                    "expected_destruction": 0,
                    "sample_size": 0
                }

        # Validate that we have defender info
        if defender_th is None:
            return {
                "player_tag": player_tag,
                "player_name": self.player_names.get(player_tag, player_tag),
                "error": "Must provide either defender_th or defender_tag",
                "expected_stars": 0,
                "expected_destruction": 0,
                "sample_size": 0
            }

        if defender_heroes is None:
            defender_heroes = []

        attacks = self.player_histories.get(player_tag, [])
        player_name = self.player_names.get(player_tag, player_tag)

        # If no attack history, try to fetch player data and use priors
        if not attacks:
            if not self.coc_client:
                return {
                    "player_tag": player_tag,
                    "player_name": player_name,
                    "error": "No attack history and cannot fetch player data: CoC client not available",
                    "expected_stars": 0,
                    "expected_destruction": 0,
                    "sample_size": 0
                }

            try:
                logger.info(f"No attack history for {player_tag}, fetching player data for fallback prediction")
                player_data = await self.coc_client.get_player(player_tag)
                if not player_data:
                    return {
                        "player_tag": player_tag,
                        "player_name": player_name,
                        "error": "No attack history and could not fetch player data",
                        "expected_stars": 0,
                        "expected_destruction": 0,
                        "sample_size": 0
                    }

                player_th = player_data.get("townHallLevel", 0)
                player_heroes = [h["level"] for h in player_data.get("heroes", [])]
                player_name = player_data.get("name", player_name)

                logger.info(f"Using fallback prediction for {player_name} (TH{player_th})")

            except Exception as e:
                logger.error(f"Error fetching player data for fallback prediction {player_tag}: {e}")
                return {
                    "player_tag": player_tag,
                    "player_name": player_name,
                    "error": f"No attack history and error fetching player data: {str(e)}",
                    "expected_stars": 0,
                    "expected_destruction": 0,
                    "sample_size": 0
                }
        else:
            player_th = attacks[-1]["attacker_th"]
            player_heroes = attacks[-1]["attacker_heroes"]

        # Filter for relevant attacks (if we have any)
        if attacks:
            relevant = [a for a in attacks if abs(a["defender_th"] - defender_th) <= 1]
            if len(relevant) < 3:
                relevant = attacks
        else:
            relevant = []

        # Get TH-level prior
        prior = self.th_priors.get(player_th, {
            "avg_destruction": 75.0,
            "std_destruction": 20.0,
            "sample_size": 0
        })

        # Calculate blended destruction with prior
        if len(relevant) >= 2:
            player_avg_destruction = sum(a["destruction"] for a in relevant) / len(relevant)
            player_variance = sum((a["destruction"] - player_avg_destruction) ** 2 for a in relevant) / len(relevant)
            player_std = player_variance ** 0.5

            player_weight = 0.7 if len(relevant) < 6 else 0.9
            prior_weight = 1 - player_weight

            avg_destruction = (player_weight * player_avg_destruction +
                             prior_weight * prior["avg_destruction"])
            destruction_std = (player_weight * player_std +
                             prior_weight * prior["std_destruction"])
        elif len(relevant) == 1:
            player_destruction = relevant[0]["destruction"]
            avg_destruction = 0.5 * player_destruction + 0.5 * prior["avg_destruction"]
            destruction_std = prior["std_destruction"]
        else:
            avg_destruction = prior["avg_destruction"]
            destruction_std = prior["std_destruction"]

        # Adjust for matchup difficulty
        difficulty = self._matchup_difficulty(
            player_th, player_heroes,
            defender_th, defender_heroes
        )

        expected_destruction = avg_destruction * difficulty
        expected_destruction = max(0, min(100, expected_destruction))

        # Convert to stars
        expected_stars = self._destruction_to_stars(expected_destruction)

        # Confidence intervals
        # Use max(1, len) to avoid division by zero for players with no history
        destruction_margin = 1.645 * destruction_std / (max(1, len(relevant)) ** 0.5)
        lower_destruction = max(0, expected_destruction - destruction_margin)
        upper_destruction = min(100, expected_destruction + destruction_margin)

        lower_stars = self._destruction_to_stars(lower_destruction)
        upper_stars = self._destruction_to_stars(upper_destruction)

        return {
            "player_tag": player_tag,
            "player_name": player_name,
            "player_th": player_th,
            "expected_stars": round(expected_stars, 2),
            "expected_destruction": round(expected_destruction, 1),
            "confidence_90_stars": [round(lower_stars, 2), round(upper_stars, 2)],
            "confidence_90_destruction": [round(lower_destruction, 1), round(upper_destruction, 1)],
            "sample_size": len(relevant),
            "total_attacks": len(attacks),
            "matchup_difficulty": round(difficulty, 2),
            "reliability": "high" if len(relevant) >= 10 else "medium" if len(relevant) >= 5 else "low"
        }

    async def get_player_stats(self, player_tag: str) -> Dict:
        """Get player attack statistics."""
        await self._load_war_data()

        # Normalize tag
        player_tag = self._normalize_tag(player_tag)

        attacks = self.player_histories.get(player_tag, [])
        player_name = self.player_names.get(player_tag, player_tag)

        if not attacks:
            return {
                "player_tag": player_tag,
                "player_name": player_name,
                "total_attacks": 0,
                "error": "No attack history"
            }

        total_stars = sum(a["stars"] for a in attacks)
        avg_stars = total_stars / len(attacks)
        avg_destruction = sum(a["destruction"] for a in attacks) / len(attacks)
        three_stars = sum(1 for a in attacks if a["stars"] == 3)
        three_star_rate = three_stars / len(attacks) * 100

        by_th_diff = defaultdict(list)
        for a in attacks:
            diff = a["attacker_th"] - a["defender_th"]
            by_th_diff[diff].append(a["stars"])

        # Sort attacks by date descending (most recent first)
        sorted_attacks = sorted(attacks, key=lambda a: a.get("date", ""), reverse=True)

        # Format individual attacks for frontend
        attack_history = [
            {
                "date": a.get("date", ""),
                "defender_th": a["defender_th"],
                "stars": a["stars"],
                "destruction": round(a["destruction"], 1),
                "attacker_th": a["attacker_th"]
            }
            for a in sorted_attacks
        ]

        return {
            "player_tag": player_tag,
            "player_name": player_name,
            "current_th": attacks[-1]["attacker_th"],
            "total_attacks": len(attacks),
            "avg_stars": round(avg_stars, 2),
            "avg_destruction": round(avg_destruction, 1),
            "three_star_rate": round(three_star_rate, 1),
            "performance_by_th_diff": {
                diff: {
                    "attacks": len(stars),
                    "avg_stars": round(sum(stars) / len(stars), 2)
                }
                for diff, stars in sorted(by_th_diff.items())
            },
            "attack_history": attack_history
        }

    async def get_priors(self) -> Dict:
        """Get TH-level priors."""
        await self._load_war_data()
        return {
            "priors": {
                f"TH{th}": {
                    "avg_destruction": round(prior["avg_destruction"], 1),
                    "std_destruction": round(prior["std_destruction"], 1),
                    "avg_stars": round(prior["avg_stars"], 2),
                    "sample_size": prior["sample_size"]
                }
                for th, prior in sorted(self.th_priors.items())
            }
        }

    async def get_lineup_strength_scores(
        self,
        player_tags: List[str],
        risk_tolerance: float = 0.5
    ) -> List[Dict]:
        """Calculate lineup strength scores for a list of players.

        Uses Bayesian predictions to evaluate each player's war potential.
        The scoring uses the same prediction model as individual predictions,
        ensuring consistency. The risk_tolerance parameter controls how
        optimistic/pessimistic the scoring is via confidence intervals.

        Args:
            player_tags: List of player tags to evaluate
            risk_tolerance: 0.0 = use lower CI bound (pessimistic/Perfect War)
                           1.0 = use expected value (optimistic/Max Participation)

        Returns:
            List of player scores with breakdown, sorted by strength_score descending
        """
        await self._load_war_data()

        results = []

        for tag in player_tags:
            normalized_tag = self._normalize_tag(tag)
            attacks = self.player_histories.get(normalized_tag, [])
            player_name = self.player_names.get(normalized_tag, tag)

            # Get current TH level (from most recent attack or API)
            if attacks:
                current_th = attacks[-1]["attacker_th"]
            else:
                # Try to fetch from API if no attack history
                if self.coc_client:
                    try:
                        player_data = await self.coc_client.get_player(tag)
                        if player_data:
                            current_th = player_data.get("townHallLevel", 0)
                            player_name = player_data.get("name", player_name)
                        else:
                            current_th = 0
                    except Exception:
                        current_th = 0
                else:
                    current_th = 0

            # Calculate metrics from attack history
            if not attacks:
                # No attack history - use TH prior with maximum uncertainty
                prior = self.th_priors.get(current_th, {
                    "avg_destruction": 75.0,
                    "std_destruction": 25.0
                })
                results.append({
                    "tag": f"#{normalized_tag}",
                    "name": player_name,
                    "town_hall": current_th,
                    "strength_score": 0,
                    "same_th_3star_rate": 0,
                    "plus_one_3star_rate": 0,
                    "avg_destruction": round(prior["avg_destruction"], 1),
                    "destruction_std": round(prior["std_destruction"], 1),
                    "sample_size": 0,
                    "reliability": "none",
                    "has_data": False
                })
                continue

            # Calculate 3-star rates by TH differential (for display only)
            same_th_attacks = [a for a in attacks if a["attacker_th"] == a["defender_th"]]
            plus_one_attacks = [a for a in attacks if a["attacker_th"] - a["defender_th"] == -1]

            same_th_3stars = sum(1 for a in same_th_attacks if a["stars"] == 3)
            plus_one_3stars = sum(1 for a in plus_one_attacks if a["stars"] == 3)

            same_th_3star_rate = (same_th_3stars / len(same_th_attacks) * 100) if same_th_attacks else None
            plus_one_3star_rate = (plus_one_3stars / len(plus_one_attacks) * 100) if plus_one_attacks else None

            # Calculate overall 3-star rate (all attacks)
            total_3stars = sum(1 for a in attacks if a["stars"] == 3)
            overall_3star_rate = total_3stars / len(attacks) * 100

            # Use Bayesian prediction approach: blend player stats with TH prior
            sample_size = len(attacks)
            prior = self.th_priors.get(current_th, {
                "avg_destruction": 75.0,
                "std_destruction": 20.0
            })

            # Calculate player's actual stats
            destructions = [a["destruction"] for a in attacks]
            player_avg = sum(destructions) / len(destructions)
            player_variance = sum((d - player_avg) ** 2 for d in destructions) / len(destructions)
            player_std = player_variance ** 0.5

            # Blend with prior based on sample size (same as predict() method)
            if sample_size >= 6:
                player_weight = 0.9
            elif sample_size >= 2:
                player_weight = 0.7
            else:
                player_weight = 0.5

            prior_weight = 1 - player_weight
            blended_avg = player_weight * player_avg + prior_weight * prior["avg_destruction"]
            blended_std = player_weight * player_std + prior_weight * prior["std_destruction"]

            # Calculate confidence interval
            ci_margin = 1.645 * blended_std / (sample_size ** 0.5)
            lower_bound = max(0, blended_avg - ci_margin)
            upper_bound = min(100, blended_avg + ci_margin)

            # Apply risk tolerance to get effective score
            # risk_tolerance: 0 = pessimistic (lower CI), 1 = optimistic (expected value)
            effective_destruction = (
                risk_tolerance * blended_avg +
                (1 - risk_tolerance) * lower_bound
            )

            # Consistency bonus (lower std = more reliable)
            consistency_bonus = 100 - min(blended_std, 30)

            # Calculate strength score
            # Primarily based on predicted destruction, with bonuses for 3-star rate and consistency
            strength_score = (
                0.70 * effective_destruction +
                0.20 * overall_3star_rate +
                0.10 * consistency_bonus
            )

            # Determine reliability
            if sample_size >= 10:
                reliability = "high"
            elif sample_size >= 5:
                reliability = "medium"
            else:
                reliability = "low"

            results.append({
                "tag": f"#{normalized_tag}",
                "name": player_name,
                "town_hall": current_th,
                "strength_score": round(strength_score, 1),
                "same_th_3star_rate": round(same_th_3star_rate, 1) if same_th_3star_rate is not None else None,
                "plus_one_3star_rate": round(plus_one_3star_rate, 1) if plus_one_3star_rate is not None else None,
                "overall_3star_rate": round(overall_3star_rate, 1),
                "avg_destruction": round(blended_avg, 1),
                "destruction_std": round(blended_std, 1),
                "confidence_range": [round(lower_bound, 1), round(upper_bound, 1)],
                "sample_size": sample_size,
                "reliability": reliability,
                "has_data": True
            })

        # Sort by strength score descending
        results.sort(key=lambda x: x["strength_score"], reverse=True)

        return results
