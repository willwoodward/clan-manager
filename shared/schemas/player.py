"""Player data schemas."""

from pydantic import BaseModel, Field
from typing import Optional


class HeroData(BaseModel):
    """Hero information."""
    name: str
    level: int
    max_level: int
    village: str


class TroopData(BaseModel):
    """Troop information."""
    name: str
    level: int
    max_level: int
    village: str


class SpellData(BaseModel):
    """Spell information."""
    name: str
    level: int
    max_level: int
    village: str


class ClanInfo(BaseModel):
    """Clan information."""
    tag: str
    name: str
    level: int


class LeagueInfo(BaseModel):
    """League information."""
    id: int
    name: str


class PlayerData(BaseModel):
    """Complete player data."""
    tag: str
    name: str
    town_hall: int
    town_hall_weapon: Optional[int] = None
    exp_level: int
    trophies: int
    best_trophies: int
    war_stars: int
    attack_wins: int
    defense_wins: int
    builder_hall: int
    builder_base_trophies: int
    best_builder_base_trophies: int
    role: Optional[str] = None
    war_opted_in: bool
    donations: int
    received: int
    clan_capital_contributions: int
    clan: Optional[ClanInfo] = None
    league: Optional[LeagueInfo] = None
    heroes: list[HeroData] = Field(default_factory=list)
    troops: list[TroopData] = Field(default_factory=list)
    spells: list[SpellData] = Field(default_factory=list)

    # War-specific fields (when fetched as part of war roster)
    war_map_position: Optional[int] = None
    war_town_hall: Optional[int] = None
