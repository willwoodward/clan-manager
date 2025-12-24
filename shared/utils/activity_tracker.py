"""Player activity tracking service with daily aggregation."""

import json
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, Optional, Any, List
import logging

logger = logging.getLogger(__name__)


class ActivityTracker:
    """Track player activity with daily aggregation and scoring."""

    # Activity scoring weights
    SCORE_PER_ATTACK = 1.0
    SCORE_PER_CC_FILL = 1.0  # Per ~50 troops (clan castle size)
    TROOPS_PER_CC = 50  # Average clan castle size
    HISTORY_DAYS = 30  # Keep last 30 days

    def __init__(self, data_dir: str = "data/activity"):
        """Initialize the activity tracker.

        Args:
            data_dir: Directory to store activity data
        """
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.activity_file = self.data_dir / "player_activity.json"

    def _load_activities(self) -> Dict[str, Any]:
        """Load player activities from file."""
        if not self.activity_file.exists():
            return {}

        try:
            with open(self.activity_file, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading player activities: {e}")
            return {}

    def _save_activities(self, activities: Dict[str, Any]):
        """Save player activities to file."""
        try:
            with open(self.activity_file, 'w') as f:
                json.dump(activities, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving player activities: {e}")

    def _calculate_activity_score(self, daily_data: Dict[str, Any]) -> float:
        """Calculate activity score for a day.

        Args:
            daily_data: Daily activity data

        Returns:
            Activity score
        """
        score = 0.0

        # Attacks: 1 point each
        score += daily_data.get("attacks", 0) * self.SCORE_PER_ATTACK

        # Donations: 1 point per clan castle fill (~50 troops)
        donations = daily_data.get("donations", 0)
        score += (donations / self.TROOPS_PER_CC) * self.SCORE_PER_CC_FILL

        # Received: 1 point per clan castle received (~50 troops)
        received = daily_data.get("received", 0)
        score += (received / self.TROOPS_PER_CC) * self.SCORE_PER_CC_FILL

        return round(score, 2)

    def _prune_old_data(self, daily_activity: Dict[str, Any]) -> Dict[str, Any]:
        """Remove data older than HISTORY_DAYS.

        Args:
            daily_activity: Daily activity dictionary

        Returns:
            Pruned daily activity dictionary
        """
        cutoff_date = (datetime.now() - timedelta(days=self.HISTORY_DAYS)).strftime("%Y-%m-%d")

        pruned = {}
        for date_str, data in daily_activity.items():
            if date_str >= cutoff_date:
                pruned[date_str] = data

        return pruned

    def update_activity(
        self,
        player_tag: str,
        player_name: str,
        activity_type: str,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Update player's activity with daily aggregation.

        Args:
            player_tag: Player tag
            player_name: Player name
            activity_type: Type of activity (donation, received, attack, etc.)
            metadata: Additional activity metadata (e.g., {"amount": 50})
        """
        activities = self._load_activities()
        today = datetime.now().strftime("%Y-%m-%d")
        now = datetime.now().isoformat()

        # Initialize player data if not exists
        if player_tag not in activities:
            activities[player_tag] = {
                "player_tag": player_tag,
                "player_name": player_name,
                "last_active": now,
                "daily_activity": {}
            }

        player_data = activities[player_tag]
        player_data["player_name"] = player_name  # Update name in case it changed
        player_data["last_active"] = now

        # Initialize daily_activity if it doesn't exist (migration from old format)
        if "daily_activity" not in player_data:
            player_data["daily_activity"] = {}

        # Initialize today's data if not exists
        if today not in player_data["daily_activity"]:
            player_data["daily_activity"][today] = {
                "donations": 0,
                "received": 0,
                "attacks": 0,
                "last_active": now
            }

        daily_data = player_data["daily_activity"][today]
        daily_data["last_active"] = now

        # Update counts based on activity type
        if activity_type == "donation":
            amount = metadata.get("amount", 0) if metadata else 0
            daily_data["donations"] += amount

        elif activity_type == "received":
            amount = metadata.get("amount", 0) if metadata else 0
            daily_data["received"] += amount

        elif activity_type == "attack":
            daily_data["attacks"] += 1

        elif activity_type == "builder_base_attack":
            # Count builder base attacks too
            daily_data["attacks"] += 1

        elif activity_type == "clan_games":
            # Clan games points don't affect daily activity score
            # but we still track the timestamp
            pass

        # Calculate and store activity score for today
        daily_data["activity_score"] = self._calculate_activity_score(daily_data)

        # Prune old data (keep last 30 days)
        player_data["daily_activity"] = self._prune_old_data(player_data["daily_activity"])

        self._save_activities(activities)

        logger.debug(f"Updated activity for {player_name}: {activity_type} (score: {daily_data['activity_score']})")

    def get_player_activity(self, player_tag: str) -> Optional[Dict[str, Any]]:
        """Get activity data for a specific player.

        Args:
            player_tag: Player tag

        Returns:
            Activity data including daily_activity or None if not found
        """
        activities = self._load_activities()
        return activities.get(player_tag)

    def get_player_activity_history(self, player_tag: str, days: int = 30) -> List[Dict[str, Any]]:
        """Get daily activity history for a player.

        Args:
            player_tag: Player tag
            days: Number of days of history to return

        Returns:
            List of daily activity data sorted by date (oldest first)
        """
        player_data = self.get_player_activity(player_tag)
        if not player_data or "daily_activity" not in player_data:
            return []

        # Get daily activity and sort by date
        daily_activity = player_data["daily_activity"]
        cutoff_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")

        history = []
        for date_str in sorted(daily_activity.keys()):
            if date_str >= cutoff_date:
                day_data = daily_activity[date_str].copy()
                day_data["date"] = date_str
                history.append(day_data)

        return history

    def get_all_activities(self) -> Dict[str, Any]:
        """Get all player activities.

        Returns:
            Dictionary of all player activities
        """
        return self._load_activities()

    def get_inactive_players(self, hours: int = 24) -> list[Dict[str, Any]]:
        """Get players who haven't been active in the specified hours.

        Args:
            hours: Number of hours to consider inactive

        Returns:
            List of inactive player data
        """
        activities = self._load_activities()
        inactive = []

        now = datetime.now()

        for player_tag, activity in activities.items():
            last_active = datetime.fromisoformat(activity["last_active"])
            hours_since = (now - last_active).total_seconds() / 3600

            if hours_since >= hours:
                activity_copy = activity.copy()
                activity_copy["hours_since_active"] = round(hours_since, 1)
                inactive.append(activity_copy)

        # Sort by most inactive first
        inactive.sort(key=lambda x: x["hours_since_active"], reverse=True)

        return inactive
