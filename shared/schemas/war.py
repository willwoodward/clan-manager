"""War data schemas."""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from .player import PlayerData


class AttackData(BaseModel):
    """Single attack in a war."""
    attacker_tag: str
    defender_tag: str
    stars: int = Field(ge=0, le=3)
    destruction: float = Field(ge=0, le=100)
    order: int


class WarMemberData(PlayerData):
    """Player data within a war context (extends PlayerData)."""
    pass


class WarData(BaseModel):
    """Complete war data."""
    state: str  # "preparation", "inWar", "warEnded", "notInWar"
    team_size: int
    clan_tag: str
    clan_name: str
    clan_level: int
    opponent_tag: str
    opponent_name: str
    opponent_level: int
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    preparation_start_time: Optional[str] = None
    clan_stars: int
    clan_destruction: float
    clan_attacks_used: int
    clan_exp_earned: Optional[int] = None
    opponent_stars: int
    opponent_destruction: float
    opponent_attacks_used: int
    opponent_exp_earned: Optional[int] = None
    attacks: list[AttackData] = Field(default_factory=list)
    clan_members: list[WarMemberData] = Field(default_factory=list)
    opponent_members: list[WarMemberData] = Field(default_factory=list)
    fetched_at: str  # ISO format timestamp
