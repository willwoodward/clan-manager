"""
Event handling modules for Clash of Clans events.

This package contains modular event handlers that are resilient to container restarts.
Each module handles a specific category of events and maintains its own state.
"""

from .war_events import setup_war_events
from .clan_games_events import setup_clan_games_events
from .player_events import setup_player_events
from .clan_events import setup_clan_events
from .season_events import setup_season_events

__all__ = [
    'setup_war_events',
    'setup_clan_games_events',
    'setup_player_events',
    'setup_clan_events',
    'setup_season_events',
]
