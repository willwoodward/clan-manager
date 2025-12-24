"""Storage for season, CWL, legend league, and capital raid events."""

import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


class EventStorage:
    """Handles storage for various CoC event types."""

    def __init__(self, data_dir: str = "data"):
        self.data_dir = Path(data_dir)
        self.seasons_dir = self.data_dir / "seasons"
        self.cwl_dir = self.data_dir / "cwl"
        self.legend_dir = self.data_dir / "legend"
        self.capital_dir = self.data_dir / "capital_raids"
        self.state_dir = self.data_dir / "event_state"

        # Create all directories
        for directory in [self.seasons_dir, self.cwl_dir, self.legend_dir,
                         self.capital_dir, self.state_dir]:
            directory.mkdir(parents=True, exist_ok=True)

        logger.info(f"Initialized event storage at {self.data_dir.absolute()}")

    # ============================================================================
    # Season End Storage
    # ============================================================================

    def save_season_data(self, season_data: dict) -> str:
        """Save monthly season end data."""
        season_id = season_data.get("season_id", datetime.now().strftime("%Y-%m"))
        filepath = self.seasons_dir / f"{season_id}.json"

        with open(filepath, "w") as f:
            json.dump(season_data, f, indent=2)

        logger.info(f"Saved season data: {filepath}")
        return str(filepath)

    def get_season_data(self, season_id: str) -> Optional[dict]:
        """Retrieve season data by ID."""
        filepath = self.seasons_dir / f"{season_id}.json"
        if not filepath.exists():
            return None

        with open(filepath, "r") as f:
            return json.load(f)

    def list_seasons(self, limit: int = 12) -> List[dict]:
        """List recent seasons."""
        files = sorted(self.seasons_dir.glob("*.json"), reverse=True)
        seasons = []

        for filepath in files[:limit]:
            try:
                with open(filepath, "r") as f:
                    data = json.load(f)
                    seasons.append({
                        "season_id": filepath.stem,
                        "end_time": data.get("end_time"),
                        "player_count": len(data.get("players", []))
                    })
            except Exception as e:
                logger.error(f"Error loading season {filepath}: {e}")

        return seasons

    # ============================================================================
    # CWL Storage
    # ============================================================================

    def save_cwl_war(self, cwl_data: dict) -> str:
        """Save CWL war data."""
        # Create month directory if it doesn't exist
        month = datetime.now().strftime("%Y-%m")
        month_dir = self.cwl_dir / month
        month_dir.mkdir(parents=True, exist_ok=True)

        # Save individual war
        war_tag = cwl_data.get("war_tag", f"war_{datetime.now().timestamp()}")
        filepath = month_dir / f"{war_tag}.json"

        with open(filepath, "w") as f:
            json.dump(cwl_data, f, indent=2)

        logger.info(f"Saved CWL war data: {filepath}")
        return str(filepath)

    def update_cwl_war(self, war_tag: str, update_data: dict) -> str:
        """Update existing CWL war data."""
        # Find the war file
        month = datetime.now().strftime("%Y-%m")
        month_dir = self.cwl_dir / month
        filepath = month_dir / f"{war_tag}.json"

        if filepath.exists():
            with open(filepath, "r") as f:
                existing_data = json.load(f)

            # Merge update data
            existing_data.update(update_data)
            existing_data["updated_at"] = datetime.now().isoformat()

            with open(filepath, "w") as f:
                json.dump(existing_data, f, indent=2)

            logger.info(f"Updated CWL war data: {filepath}")
        else:
            # Create new if doesn't exist
            update_data["war_tag"] = war_tag
            filepath = month_dir / f"{war_tag}.json"
            with open(filepath, "w") as f:
                json.dump(update_data, f, indent=2)
            logger.info(f"Created CWL war data: {filepath}")

        return str(filepath)

    def get_cwl_month_data(self, month: str = None) -> List[dict]:
        """Get all CWL wars for a specific month."""
        if month is None:
            month = datetime.now().strftime("%Y-%m")

        month_dir = self.cwl_dir / month
        if not month_dir.exists():
            return []

        wars = []
        for filepath in sorted(month_dir.glob("*.json")):
            try:
                with open(filepath, "r") as f:
                    wars.append(json.load(f))
            except Exception as e:
                logger.error(f"Error loading CWL war {filepath}: {e}")

        return wars

    # ============================================================================
    # Legend League Reset Storage
    # ============================================================================

    def save_legend_reset(self, reset_data: dict) -> str:
        """Save weekly legend league reset data."""
        reset_id = reset_data.get("reset_date", datetime.now().strftime("%Y-W%U"))
        filepath = self.legend_dir / f"{reset_id}.json"

        with open(filepath, "w") as f:
            json.dump(reset_data, f, indent=2)

        logger.info(f"Saved legend reset data: {filepath}")
        return str(filepath)

    def get_legend_reset(self, reset_id: str) -> Optional[dict]:
        """Retrieve legend reset data by ID."""
        filepath = self.legend_dir / f"{reset_id}.json"
        if not filepath.exists():
            return None

        with open(filepath, "r") as f:
            return json.load(f)

    def list_legend_resets(self, limit: int = 52) -> List[dict]:
        """List recent legend resets (default 1 year)."""
        files = sorted(self.legend_dir.glob("*.json"), reverse=True)
        resets = []

        for filepath in files[:limit]:
            try:
                with open(filepath, "r") as f:
                    data = json.load(f)
                    resets.append({
                        "reset_id": filepath.stem,
                        "timestamp": data.get("timestamp"),
                        "player_count": len(data.get("players", []))
                    })
            except Exception as e:
                logger.error(f"Error loading legend reset {filepath}: {e}")

        return resets

    # ============================================================================
    # Capital Raid Weekend Storage
    # ============================================================================

    def save_capital_raid(self, raid_data: dict) -> str:
        """Save capital raid weekend data."""
        raid_id = raid_data.get("raid_id", f"raid_{datetime.now().strftime('%Y-W%U')}")
        filepath = self.capital_dir / f"{raid_id}.json"

        with open(filepath, "w") as f:
            json.dump(raid_data, f, indent=2)

        logger.info(f"Saved capital raid data: {filepath}")
        return str(filepath)

    def get_capital_raid(self, raid_id: str) -> Optional[dict]:
        """Retrieve capital raid data by ID."""
        filepath = self.capital_dir / f"{raid_id}.json"
        if not filepath.exists():
            return None

        with open(filepath, "r") as f:
            return json.load(f)

    def list_capital_raids(self, limit: int = 52) -> List[dict]:
        """List recent capital raids (default 1 year)."""
        files = sorted(self.capital_dir.glob("*.json"), reverse=True)
        raids = []

        for filepath in files[:limit]:
            try:
                with open(filepath, "r") as f:
                    data = json.load(f)
                    raids.append({
                        "raid_id": filepath.stem,
                        "end_time": data.get("end_time"),
                        "total_capital_loot": data.get("total_capital_loot", 0)
                    })
            except Exception as e:
                logger.error(f"Error loading capital raid {filepath}: {e}")

        return raids

    # ============================================================================
    # State Management (for container restart resilience)
    # ============================================================================

    def save_state(self, event_type: str, state_data: dict) -> None:
        """Save event processing state to prevent duplicates on restart."""
        filepath = self.state_dir / f"{event_type}_state.json"

        with open(filepath, "w") as f:
            json.dump(state_data, f, indent=2)

        logger.debug(f"Saved {event_type} state")

    def get_state(self, event_type: str) -> Optional[dict]:
        """Retrieve event processing state."""
        filepath = self.state_dir / f"{event_type}_state.json"
        if not filepath.exists():
            return None

        try:
            with open(filepath, "r") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading {event_type} state: {e}")
            return None
