"""War strategy optimizer - suggests optimal attack assignments."""

import logging
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from .predictor import PlayerPredictor

logger = logging.getLogger(__name__)


@dataclass
class Member:
    """War member data."""
    tag: str
    name: str
    town_hall: int
    heroes: List[int]


@dataclass
class AttackSuggestion:
    """Suggested attack assignment."""
    attacker_tag: str
    attacker_name: str
    defender_tag: str
    defender_name: str
    expected_stars: float
    expected_destruction: float
    confidence_lower: float
    confidence_upper: float
    reliability: str
    priority: int  # 1 = highest priority


class WarStrategyOptimizer:
    """Optimizes attack assignments for maximum expected stars."""

    def __init__(self, predictor: PlayerPredictor):
        self.predictor = predictor

    async def calculate_all_matchups(
        self,
        attackers: List[Member],
        defenders: List[Member]
    ) -> Dict[str, Dict[str, Dict]]:
        """
        Calculate predictions for all possible matchups.

        Returns:
            Dict[attacker_tag][defender_tag] = prediction
        """
        matchup_matrix = {}
        skipped_count = 0

        for attacker in attackers:
            matchup_matrix[attacker.tag] = {}

            for defender in defenders:
                try:
                    prediction = await self.predictor.predict(
                        player_tag=attacker.tag,
                        defender_th=defender.town_hall,
                        defender_heroes=defender.heroes
                    )

                    # Include prediction even if reliability is low (from fallback)
                    # Only skip if there's an actual error
                    if "error" not in prediction:
                        matchup_matrix[attacker.tag][defender.tag] = prediction
                    else:
                        logger.warning(f"Skipping matchup {attacker.name} vs {defender.name}: {prediction.get('error')}")
                        skipped_count += 1

                except Exception as e:
                    logger.error(f"Error predicting {attacker.tag} vs {defender.tag}: {e}")
                    skipped_count += 1

        if skipped_count > 0:
            logger.warning(f"Skipped {skipped_count} matchups due to errors")

        return matchup_matrix

    def _calculate_priority_score(self, prediction: Dict, strategy_type: str = "balanced") -> float:
        """
        Calculate priority score for an attack based on strategy type.
        Higher score = better attack to prioritize.

        Args:
            prediction: Prediction dictionary with expected_stars, reliability, etc.
            strategy_type: "aggressive", "balanced", or "safe"
        """
        expected_stars = prediction.get("expected_stars", 0)
        reliability = prediction.get("reliability", "low")
        confidence_range = prediction.get("confidence_90_stars", [0, 0])
        confidence_width = confidence_range[1] - confidence_range[0]

        # Base score is expected stars
        score = expected_stars

        # Strategy-specific adjustments
        if strategy_type == "aggressive":
            # Aggressive: Maximize expected stars, ignore reliability
            # Bonus for high stars, minimal penalty for uncertainty
            reliability_bonus = {
                "high": 0.2,
                "medium": 0.1,
                "low": 0.0
            }.get(reliability, 0.0)
            uncertainty_penalty = min(0.2, confidence_width * 0.05)

            # Big bonus for high expected stars
            if expected_stars >= 2.5:
                score += 0.5

        elif strategy_type == "safe":
            # Safe: Prioritize reliability and narrow confidence intervals
            # Heavy penalties for uncertainty
            reliability_bonus = {
                "high": 1.0,
                "medium": 0.4,
                "low": -0.5  # Negative for low reliability!
            }.get(reliability, 0.0)
            uncertainty_penalty = min(1.0, confidence_width * 0.2)

            # Penalty for risky attacks
            if reliability == "low":
                score *= 0.6

        else:  # balanced
            # Balanced: Middle ground
            reliability_bonus = {
                "high": 0.5,
                "medium": 0.25,
                "low": 0.0
            }.get(reliability, 0.0)
            uncertainty_penalty = min(0.5, confidence_width * 0.1)

        return score + reliability_bonus - uncertainty_penalty

    async def generate_strategy(
        self,
        attackers: List[Member],
        defenders: List[Member],
        attacks_per_member: int = 2,
        strategy_type: str = "balanced"
    ) -> Dict:
        """
        Generate optimal war strategy.

        Args:
            attackers: List of clan members
            defenders: List of opponent members
            attacks_per_member: Number of attacks each member gets
            strategy_type: "balanced", "aggressive", or "safe"

        Returns:
            Dictionary containing strategy suggestions and statistics
        """
        logger.info(f"Generating {strategy_type} strategy for {len(attackers)} vs {len(defenders)}")

        # Calculate all matchups
        matchup_matrix = await self.calculate_all_matchups(attackers, defenders)

        # Create attacker/defender lookups
        attacker_lookup = {a.tag: a for a in attackers}
        defender_lookup = {d.tag: d for d in defenders}

        # Greedy strategy: assign attacks based on priority scores
        suggestions: List[AttackSuggestion] = []
        attacks_assigned = {a.tag: 0 for a in attackers}
        defender_attacks = {d.tag: [] for d in defenders}

        # Build list of all possible attacks with scores
        all_attacks = []
        for attacker_tag, defender_predictions in matchup_matrix.items():
            for defender_tag, prediction in defender_predictions.items():
                # Calculate score using strategy-aware scoring
                score = self._calculate_priority_score(prediction, strategy_type)

                all_attacks.append({
                    "attacker_tag": attacker_tag,
                    "defender_tag": defender_tag,
                    "prediction": prediction,
                    "score": score
                })

        # Sort by score (highest first)
        all_attacks.sort(key=lambda x: x["score"], reverse=True)

        # PHASE 1: Ensure all defenders are targeted at least once
        untargeted_defenders = set(d.tag for d in defenders)

        for attack in all_attacks:
            if not untargeted_defenders:
                break

            attacker_tag = attack["attacker_tag"]
            defender_tag = attack["defender_tag"]

            # Skip if this defender is already targeted
            if defender_tag not in untargeted_defenders:
                continue

            # Check if attacker has attacks remaining
            if attacks_assigned[attacker_tag] >= attacks_per_member:
                continue

            # Assign attack
            attacker = attacker_lookup[attacker_tag]
            defender = defender_lookup[defender_tag]
            prediction = attack["prediction"]

            suggestion = AttackSuggestion(
                attacker_tag=attacker_tag,
                attacker_name=attacker.name,
                defender_tag=defender_tag,
                defender_name=defender.name,
                expected_stars=prediction.get("expected_stars", 0),
                expected_destruction=prediction.get("expected_destruction", 0),
                confidence_lower=prediction.get("confidence_90_stars", [0, 0])[0],
                confidence_upper=prediction.get("confidence_90_stars", [0, 0])[1],
                reliability=prediction.get("reliability", "low"),
                priority=len(suggestions) + 1
            )

            suggestions.append(suggestion)
            attacks_assigned[attacker_tag] += 1
            defender_attacks[defender_tag].append(attacker_tag)
            untargeted_defenders.remove(defender_tag)

        # PHASE 2: Assign remaining attacks for cleanup/securing stars
        for attack in all_attacks:
            # Check if all attacks have been assigned
            total_assigned = sum(attacks_assigned.values())
            total_available = len(attackers) * attacks_per_member
            if total_assigned >= total_available:
                break

            attacker_tag = attack["attacker_tag"]
            defender_tag = attack["defender_tag"]

            # Check if attacker has attacks remaining
            if attacks_assigned[attacker_tag] >= attacks_per_member:
                continue

            # Strategy-specific attack distribution logic
            existing_attacks_on_base = [
                s for s in suggestions if s.defender_tag == defender_tag
            ]

            if strategy_type == "aggressive":
                # Aggressive: Go for 3-stars, allow more attacks on same base
                # Max 4 attacks per base (willing to throw more attacks for 3-star)
                if len(defender_attacks[defender_tag]) >= 4:
                    continue

                # Allow double high-star attacks if pursuing 3-star
                if existing_attacks_on_base:
                    best_existing = max(s.expected_stars for s in existing_attacks_on_base)
                    current_expected = attack["prediction"].get("expected_stars", 0)

                    # Only skip if we already have a 3-star or multiple 2.5+ attacks
                    if best_existing >= 3.0:
                        continue
                    if best_existing >= 2.5 and current_expected >= 2.5 and len(existing_attacks_on_base) >= 2:
                        continue

            elif strategy_type == "safe":
                # Safe: Spread attacks, avoid stacking on well-covered bases
                # Max 2 attacks per base (conservative distribution)
                if len(defender_attacks[defender_tag]) >= 2:
                    continue

                # Very conservative about double-attacking
                if existing_attacks_on_base:
                    best_existing = max(s.expected_stars for s in existing_attacks_on_base)
                    current_expected = attack["prediction"].get("expected_stars", 0)

                    # Skip if already have a decent attack (2+ stars)
                    if best_existing >= 2.0 and current_expected >= 1.5:
                        continue

            else:  # balanced
                # Balanced: Standard logic
                # Max 3 attacks per base
                if len(defender_attacks[defender_tag]) >= 3:
                    continue

                # Don't waste attacks on well-covered bases
                if existing_attacks_on_base:
                    best_existing = max(s.expected_stars for s in existing_attacks_on_base)
                    current_expected = attack["prediction"].get("expected_stars", 0)

                    # Skip if we're adding another high-star attack to an already well-covered base
                    if best_existing >= 2.5 and current_expected >= 2.0:
                        continue

            # Assign attack
            attacker = attacker_lookup[attacker_tag]
            defender = defender_lookup[defender_tag]
            prediction = attack["prediction"]

            suggestion = AttackSuggestion(
                attacker_tag=attacker_tag,
                attacker_name=attacker.name,
                defender_tag=defender_tag,
                defender_name=defender.name,
                expected_stars=prediction.get("expected_stars", 0),
                expected_destruction=prediction.get("expected_destruction", 0),
                confidence_lower=prediction.get("confidence_90_stars", [0, 0])[0],
                confidence_upper=prediction.get("confidence_90_stars", [0, 0])[1],
                reliability=prediction.get("reliability", "low"),
                priority=len(suggestions) + 1
            )

            suggestions.append(suggestion)
            attacks_assigned[attacker_tag] += 1
            defender_attacks[defender_tag].append(attacker_tag)

        # Calculate statistics
        # In CoC, only the best attack on each base counts, so group by defender
        best_stars_per_defender = {}
        for s in suggestions:
            if s.defender_tag not in best_stars_per_defender:
                best_stars_per_defender[s.defender_tag] = s.expected_stars
            else:
                best_stars_per_defender[s.defender_tag] = max(
                    best_stars_per_defender[s.defender_tag],
                    s.expected_stars
                )

        # Total expected stars is the sum of best expected stars per defender
        total_expected_stars = sum(best_stars_per_defender.values())
        high_confidence_attacks = sum(1 for s in suggestions if s.reliability == "high")
        coverage = len(best_stars_per_defender)

        # Strategy descriptions
        strategy_descriptions = {
            "aggressive": "Maximizes expected stars by taking calculated risks. Prioritizes high-star attacks even with lower reliability. Willing to stack multiple attacks on bases to secure 3-stars.",
            "balanced": "Balanced approach considering both expected stars and reliability. Moderate attack distribution with reasonable risk tolerance.",
            "safe": "Prioritizes reliability and consistency. Heavy penalties for uncertain predictions. Spreads attacks conservatively to minimize risk and ensure steady stars."
        }

        return {
            "strategy_type": strategy_type,
            "strategy_description": strategy_descriptions.get(strategy_type, "Unknown strategy type"),
            "total_attackers": len(attackers),
            "total_defenders": len(defenders),
            "attacks_per_member": attacks_per_member,
            "suggestions": [
                {
                    "priority": s.priority,
                    "attacker_tag": s.attacker_tag,
                    "attacker_name": s.attacker_name,
                    "defender_tag": s.defender_tag,
                    "defender_name": s.defender_name,
                    "expected_stars": round(s.expected_stars, 2),
                    "expected_destruction": round(s.expected_destruction, 1),
                    "confidence_range": [round(s.confidence_lower, 2), round(s.confidence_upper, 2)],
                    "reliability": s.reliability
                }
                for s in suggestions
            ],
            "statistics": {
                "total_expected_stars": round(total_expected_stars, 2),
                "attacks_assigned": len(suggestions),
                "attacks_available": len(attackers) * attacks_per_member,
                "high_confidence_attacks": high_confidence_attacks,
                "medium_confidence_attacks": sum(1 for s in suggestions if s.reliability == "medium"),
                "low_confidence_attacks": sum(1 for s in suggestions if s.reliability == "low"),
                "defenders_targeted": coverage,
                "avg_expected_stars_per_attack": round(total_expected_stars / len(suggestions), 2) if suggestions else 0
            }
        }
