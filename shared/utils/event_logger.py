"""Event logging system for tracking clan activities."""

import json
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


class EventLogger:
    """Logger for clan events (member joins/leaves, donations, wars, etc.)."""

    def __init__(self, data_dir: str = "data/events"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.events_file = self.data_dir / "clan_events.json"

        # Initialize events file if it doesn't exist
        if not self.events_file.exists():
            self._save_events([])

    def _load_events(self) -> List[Dict[str, Any]]:
        """Load events from file."""
        try:
            with open(self.events_file, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading events: {e}")
            return []

    def _save_events(self, events: List[Dict[str, Any]]):
        """Save events to file."""
        try:
            with open(self.events_file, 'w') as f:
                json.dump(events, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving events: {e}")

    def log_event(
        self,
        event_type: str,
        title: str,
        description: str,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """
        Log a new event.

        Args:
            event_type: Type of event (member_join, member_leave, war_start, etc.)
            title: Short title for the event
            description: Detailed description
            metadata: Additional event data
        """
        event = {
            "id": f"{event_type}_{int(datetime.now().timestamp())}",
            "type": event_type,
            "title": title,
            "description": description,
            "timestamp": datetime.now().isoformat(),
            "metadata": metadata or {}
        }

        events = self._load_events()
        events.insert(0, event)  # Add to beginning (most recent first)

        # Keep only last 100 events
        events = events[:100]

        self._save_events(events)
        logger.info(f"Logged event: {event_type} - {title}")

    def get_events(self, limit: int = 50, event_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get recent events.

        Args:
            limit: Maximum number of events to return
            event_type: Filter by event type (optional)

        Returns:
            List of events
        """
        events = self._load_events()

        if event_type:
            events = [e for e in events if e['type'] == event_type]

        return events[:limit]

    def clear_old_events(self, days: int = 30):
        """Clear events older than specified days."""
        from datetime import timedelta

        events = self._load_events()
        cutoff = datetime.now() - timedelta(days=days)

        filtered_events = [
            e for e in events
            if datetime.fromisoformat(e['timestamp']) > cutoff
        ]

        self._save_events(filtered_events)
        logger.info(f"Cleared {len(events) - len(filtered_events)} old events")


# Event type constants
class EventType:
    MEMBER_JOIN = "member_join"
    MEMBER_LEAVE = "member_leave"
    WAR_START = "war_start"
    WAR_END = "war_end"
    WAR_WON = "war_won"
    WAR_LOST = "war_lost"
    DONATION_MILESTONE = "donation_milestone"
    PROMOTION = "promotion"
    DEMOTION = "demotion"
    CLAN_LEVEL_UP = "clan_level_up"
