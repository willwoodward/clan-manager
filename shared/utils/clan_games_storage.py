"""Clan games session storage and management."""

import json
from pathlib import Path
from datetime import datetime
from typing import Dict, Optional, Any, List
import logging

logger = logging.getLogger(__name__)


class ClanGamesStorage:
    """Manage clan games sessions with persistence."""

    def __init__(self, data_dir: str = "data/clan_games"):
        """Initialize the clan games storage.

        Args:
            data_dir: Directory to store clan games data
        """
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.sessions_file = self.data_dir / "sessions.json"
        self.current_session_file = self.data_dir / "current_session.json"

    def _load_sessions(self) -> List[Dict[str, Any]]:
        """Load all clan games sessions from file."""
        if not self.sessions_file.exists():
            return []

        try:
            with open(self.sessions_file, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading sessions: {e}")
            return []

    def _save_sessions(self, sessions: List[Dict[str, Any]]):
        """Save sessions to file."""
        try:
            with open(self.sessions_file, 'w') as f:
                json.dump(sessions, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving sessions: {e}")

    def _load_current_session(self) -> Optional[Dict[str, Any]]:
        """Load the current active session."""
        if not self.current_session_file.exists():
            return None

        try:
            with open(self.current_session_file, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading current session: {e}")
            return None

    def _save_current_session(self, session: Optional[Dict[str, Any]]):
        """Save the current session to file."""
        try:
            if session is None:
                if self.current_session_file.exists():
                    self.current_session_file.unlink()
            else:
                with open(self.current_session_file, 'w') as f:
                    json.dump(session, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving current session: {e}")

    def start_session(self, initial_standings: Dict[str, int] = None) -> Dict[str, Any]:
        """Start a new clan games session.

        Args:
            initial_standings: Dict of player_tag -> current_points

        Returns:
            The created session
        """
        current = self._load_current_session()
        if current and current.get("status") == "active":
            raise ValueError("A clan games session is already active")

        session = {
            "session_id": f"games_{int(datetime.now().timestamp())}",
            "start_time": datetime.now().isoformat(),
            "end_time": None,
            "status": "active",
            "players": {}
        }

        if initial_standings:
            for player_tag, points in initial_standings.items():
                session["players"][player_tag] = {
                    "player_tag": player_tag,
                    "start_points": points,
                    "current_points": points,
                    "points_earned": 0
                }

        self._save_current_session(session)
        logger.info(f"Started new clan games session: {session['session_id']}")
        return session

    def get_current_session(self) -> Optional[Dict[str, Any]]:
        """Get the current active session."""
        return self._load_current_session()

    def update_player_points(self, player_tag: str, player_name: str, new_total_points: int):
        """Update a player's points in the current session.

        Args:
            player_tag: Player tag
            player_name: Player name
            new_total_points: Their new total points (from Games Champion achievement)
        """
        session = self._load_current_session()
        if not session or session.get("status") != "active":
            logger.warning(f"No active session to update for {player_tag}")
            return

        current_time = datetime.now().isoformat()

        if player_tag not in session["players"]:
            # New player who started contributing
            session["players"][player_tag] = {
                "player_tag": player_tag,
                "player_name": player_name,
                "start_points": new_total_points,
                "current_points": new_total_points,
                "points_earned": 0,
                "first_contribution_time": current_time,
                "last_update_time": current_time
            }
        else:
            # Update existing player
            player = session["players"][player_tag]
            old_points_earned = player.get("points_earned", 0)
            new_points_earned = new_total_points - player["start_points"]

            player["player_name"] = player_name  # Update name in case it changed
            player["current_points"] = new_total_points
            player["points_earned"] = new_points_earned
            player["last_update_time"] = current_time

            # Track when player first started contributing (if not already set)
            if "first_contribution_time" not in player and new_points_earned > 0:
                player["first_contribution_time"] = current_time

            # Track completion time when they stop increasing (reached their final score)
            # Update completion_time whenever points increase
            if new_points_earned > old_points_earned:
                player["completion_time"] = current_time

        self._save_current_session(session)

    def end_session(self, clan_size: int = None) -> Optional[Dict[str, Any]]:
        """End the current clan games session.

        Args:
            clan_size: Total clan members (for participation rate calculation)

        Returns:
            The completed session with summary and leaderboard
        """
        session = self._load_current_session()
        if not session:
            logger.warning("No active session to end")
            return None

        session["end_time"] = datetime.now().isoformat()
        session["status"] = "completed"

        # Generate leaderboard with rankings (only include contributors)
        players = list(session["players"].values())
        contributors = [p for p in players if p.get("points_earned", 0) > 0]
        # Sort by points earned (descending), then completion_rank/time (ascending for ties)
        # Use completion_time if available (for automatic tracking), otherwise use completion_rank
        contributors.sort(
            key=lambda p: (
                -p.get("points_earned", 0),
                p.get("completion_rank", 999) if "completion_rank" in p else p.get("completion_time", "9999-99-99")
            )
        )

        leaderboard = []
        for rank, player in enumerate(contributors, 1):
            leaderboard.append({
                "rank": rank,
                "player_tag": player["player_tag"],
                "player_name": player["player_name"],
                "points_earned": player["points_earned"],
                "start_points": player["start_points"],
                "final_points": player["current_points"]
            })

        # Calculate summary statistics (only count contributors)
        total_points = sum(p["points_earned"] for p in contributors)
        participants = len(contributors)
        participation_rate = (participants / clan_size * 100) if clan_size else 0

        session["summary"] = {
            "total_points": total_points,
            "participants": participants,
            "participation_rate": round(participation_rate, 1),
            "clan_size": clan_size
        }
        session["leaderboard"] = leaderboard

        # Keep original players dict for compatibility
        # session["players"] remains unchanged

        # Save to historical sessions
        sessions = self._load_sessions()
        sessions.insert(0, session)  # Most recent first
        self._save_sessions(sessions)

        # Clear current session
        self._save_current_session(None)

        logger.info(f"Ended clan games session: {session['session_id']} - {participants} participants, {total_points:,} total points")
        return session

    def get_all_sessions(self) -> List[Dict[str, Any]]:
        """Get all historical sessions."""
        return self._load_sessions()

    def get_session_leaderboard(self, session: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """Get leaderboard for a session (current or specified).

        Args:
            session: Specific session, or None for current

        Returns:
            List of contributors (points > 0) sorted by points_earned descending, then completion_rank ascending
        """
        if session is None:
            session = self._load_current_session()

        if not session:
            return []

        players = list(session["players"].values())
        # Filter to only include contributors (points earned > 0)
        contributors = [p for p in players if p.get("points_earned", 0) > 0]

        # Auto-assign completion_rank based on completion_time if not already set
        # This allows for both manual ranks (from migration) and automatic timestamp-based ranks
        for player in contributors:
            if "completion_rank" not in player and "completion_time" in player:
                # Will be assigned after sorting
                pass

        # Sort by points earned (descending), then by completion time/rank (ascending for ties)
        # Use completion_time if available (for automatic tracking), otherwise use completion_rank
        contributors.sort(
            key=lambda p: (
                -p.get("points_earned", 0),
                p.get("completion_rank", 999) if "completion_rank" in p else p.get("completion_time", "9999-99-99")
            )
        )

        return contributors
