"""
Shared CoC API client using coc.py.

This module provides a unified wrapper around coc.py for both backend and data-collector.
"""

import coc
import logging
from typing import Optional, Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)


class CoCClient:
    """Shared wrapper for Clash of Clans API using coc.py."""

    def __init__(self, email: str, password: str):
        """
        Initialize CoC client.

        Args:
            email: CoC developer account email
            password: CoC developer account password
        """
        self.email = email
        self.password = password
        self.client: Optional[coc.Client] = None
        self._logged_in = False

    async def login(self):
        """Login to CoC API."""
        if self._logged_in and self.client is not None:
            return

        temp_client = coc.Client()
        try:
            await temp_client.login(self.email, self.password)
            self.client = temp_client
            self._logged_in = True
            logger.info("Successfully logged in to CoC API via coc.py")
        except Exception as e:
            logger.error(f"Failed to login to CoC API: {e}")
            # Clean up failed client
            try:
                await temp_client.close()
            except:
                pass
            self.client = None
            self._logged_in = False
            raise

    async def close(self):
        """Close the coc.py client."""
        if self.client:
            await self.client.close()
            self.client = None
            self._logged_in = False

    async def _reset_client(self):
        """Reset the client connection after an error."""
        logger.warning("Resetting CoC client due to error")
        await self.close()
        # Next login() call will create a fresh client

    def _normalize_tag(self, tag: str) -> str:
        """Normalize clan/player tag."""
        tag = tag.upper().strip()
        if not tag.startswith('#'):
            tag = f"#{tag}"
        return tag

    async def get_clan(self, clan_tag: str) -> Optional[coc.Clan]:
        """
        Get clan information.

        Args:
            clan_tag: Clan tag (with or without #)

        Returns:
            coc.Clan object or None if not found
        """
        try:
            await self.login()
        except Exception as e:
            logger.error(f"Login failed for get_clan: {e}")
            return None

        try:
            normalized_tag = self._normalize_tag(clan_tag)
            return await self.client.get_clan(normalized_tag)
        except coc.NotFound:
            logger.warning(f"Clan not found: {clan_tag}")
            return None
        except Exception as e:
            logger.error(f"Error fetching clan {clan_tag}: {e}")
            return None

    async def get_player(self, player_tag: str) -> Optional[coc.Player]:
        """
        Get player information.

        Args:
            player_tag: Player tag (with or without #)

        Returns:
            coc.Player object or None if not found
        """
        try:
            await self.login()
        except Exception as e:
            logger.error(f"Login failed for get_player: {e}")
            return None

        try:
            normalized_tag = self._normalize_tag(player_tag)
            return await self.client.get_player(normalized_tag)
        except coc.NotFound:
            logger.warning(f"Player not found: {player_tag}")
            return None
        except Exception as e:
            logger.error(f"Error fetching player {player_tag}: {e}")
            return None

    async def get_current_war(self, clan_tag: str) -> Optional[coc.ClanWar]:
        """
        Get current war information.

        Args:
            clan_tag: Clan tag (with or without #)

        Returns:
            coc.ClanWar object or None if not found/private
        """
        try:
            await self.login()
        except Exception as e:
            logger.error(f"Login failed for get_current_war: {e}")
            return None

        try:
            normalized_tag = self._normalize_tag(clan_tag)
            return await self.client.get_current_war(normalized_tag)
        except coc.PrivateWarLog:
            logger.warning(f"War log is private for clan: {clan_tag}")
            return None
        except coc.NotFound:
            logger.warning(f"Clan not found: {clan_tag}")
            return None
        except Exception as e:
            logger.error(f"Error fetching current war for {clan_tag}: {e}")
            return None

    # Conversion utilities for API responses

    @staticmethod
    def clan_to_dict(clan: coc.Clan) -> Dict[str, Any]:
        """Convert coc.Clan to dict for API responses. Uses getattr for all optional fields."""
        return {
            "tag": clan.tag,
            "name": clan.name,
            "type": getattr(clan, 'type', 'unknown'),
            "description": getattr(clan, 'description', ''),
            "location": {
                "id": clan.location.id if clan.location else None,
                "name": clan.location.name if clan.location else None,
                "isCountry": getattr(clan.location, 'is_country', None) if clan.location else None,
            } if clan.location else None,
            "badgeUrls": {
                "small": str(clan.badge.small) if clan.badge else None,
                "large": str(clan.badge.large) if clan.badge else None,
                "medium": str(clan.badge.medium) if clan.badge else None,
            } if clan.badge else None,
            "clanLevel": getattr(clan, 'level', 0),
            "clanPoints": getattr(clan, 'points', 0),
            "clanVersusPoints": getattr(clan, 'versus_points', 0),
            "clanCapitalPoints": getattr(clan, 'capital_points', 0),
            "requiredTrophies": getattr(clan, 'required_trophies', 0),
            "warFrequency": getattr(clan, 'war_frequency', 'unknown'),
            "warWinStreak": getattr(clan, 'war_win_streak', 0),
            "warWins": getattr(clan, 'war_wins', 0),
            "warTies": getattr(clan, 'war_ties', 0),
            "warLosses": getattr(clan, 'war_losses', 0),
            "isWarLogPublic": getattr(clan, 'public_war_log', False),
            "warLeague": {
                "id": clan.war_league.id if clan.war_league else None,
                "name": clan.war_league.name if clan.war_league else None,
            } if clan.war_league else None,
            "members": getattr(clan, 'member_count', 0),
            "memberList": [
                {
                    "tag": member.tag,
                    "name": member.name,
                    "role": member.role.name if hasattr(member, 'role') and member.role else None,
                    "expLevel": getattr(member, 'exp_level', 0),
                    "league": {
                        "id": member.league.id if member.league else None,
                        "name": member.league.name if member.league else None,
                    } if hasattr(member, 'league') and member.league else None,
                    "leagueTier": {
                        "id": member.league.id if member.league else None,
                        "name": member.league.name if member.league else None,
                        "iconUrls": {
                            "small": str(member.league.icon.small) if member.league and hasattr(member.league, 'icon') and member.league.icon else None,
                            "tiny": str(member.league.icon.tiny) if member.league and hasattr(member.league, 'icon') and member.league.icon else None,
                            "medium": str(member.league.icon.medium) if member.league and hasattr(member.league, 'icon') and member.league.icon else None,
                        } if member.league and hasattr(member.league, 'icon') and member.league.icon else None,
                    } if hasattr(member, 'league') and member.league else None,
                    "townHallLevel": getattr(member, 'town_hall', 0),
                    "trophies": getattr(member, 'trophies', 0),
                    "versusTrophies": getattr(member, 'versus_trophies', 0),
                    "clanRank": getattr(member, 'clan_rank', 0),
                    "previousClanRank": getattr(member, 'previous_clan_rank', getattr(member, 'clan_rank', 0)),
                    "donations": getattr(member, 'donations', 0),
                    "donationsReceived": getattr(member, 'received', 0),
                    "warStars": getattr(member, 'war_stars', 0),
                    "warPreference": 'in' if getattr(member, 'war_opted_in', False) else 'out',
                }
                for member in (clan.members or [])
            ],
            "labels": [
                {"id": label.id, "name": label.name}
                for label in (clan.labels or [])
            ],
        }

    @staticmethod
    def player_to_dict(player: coc.Player) -> Dict[str, Any]:
        """Convert coc.Player to dict for API responses."""
        return {
            "tag": player.tag,
            "name": player.name,
            "townHallLevel": player.town_hall,
            "townHallWeaponLevel": getattr(player, 'town_hall_weapon', None),
            "expLevel": player.exp_level,
            "trophies": player.trophies,
            "bestTrophies": player.best_trophies,
            "warStars": player.war_stars,
            "attackWins": player.attack_wins,
            "defenseWins": player.defense_wins,
            "builderHallLevel": getattr(player, 'builder_hall', None),
            "versusTrophies": getattr(player, 'versus_trophies', 0),
            "bestVersusTrophies": getattr(player, 'best_versus_trophies', 0),
            "versusBattleWins": getattr(player, 'versus_attack_wins', 0),
            "role": player.role.name if player.role else None,
            "warPreference": getattr(player, 'war_opted_in', None),
            "donations": player.donations,
            "donationsReceived": player.received,
            "clanCapitalContributions": getattr(player, 'clan_capital_contributions', 0),
            "clan": {
                "tag": player.clan.tag if player.clan else None,
                "name": player.clan.name if player.clan else None,
                "clanLevel": player.clan.level if player.clan else None,
                "badgeUrls": {
                    "small": str(player.clan.badge.small) if player.clan and player.clan.badge else None,
                    "large": str(player.clan.badge.large) if player.clan and player.clan.badge else None,
                    "medium": str(player.clan.badge.medium) if player.clan and player.clan.badge else None,
                } if player.clan and player.clan.badge else None,
            } if player.clan else None,
            "league": {
                "id": player.league.id if player.league else None,
                "name": player.league.name if player.league else None,
                "iconUrls": {
                    "small": str(player.league.icon.small) if player.league and player.league.icon else None,
                    "tiny": str(player.league.icon.tiny) if player.league and player.league.icon else None,
                    "medium": str(player.league.icon.medium) if player.league and player.league.icon else None,
                } if player.league and hasattr(player.league, 'icon') and player.league.icon else None,
            } if player.league else None,
            "heroes": [
                {
                    "name": hero.name,
                    "level": hero.level,
                    "maxLevel": hero.max_level,
                    "village": hero.village,
                }
                for hero in (player.heroes or [])
            ],
            "troops": [
                {
                    "name": troop.name,
                    "level": troop.level,
                    "maxLevel": troop.max_level,
                    "village": troop.village,
                }
                for troop in (player.troops or [])
            ],
            "spells": [
                {
                    "name": spell.name,
                    "level": spell.level,
                    "maxLevel": spell.max_level,
                    "village": spell.village,
                }
                for spell in (player.spells or [])
            ],
        }

    @staticmethod
    def war_to_dict(war: coc.ClanWar) -> Dict[str, Any]:
        """Convert coc.ClanWar to dict for API responses."""
        return {
            "state": war.state,
            "teamSize": war.team_size,
            "preparationStartTime": war.preparation_start_time.time.isoformat() if war.preparation_start_time else None,
            "startTime": war.start_time.time.isoformat() if war.start_time else None,
            "endTime": war.end_time.time.isoformat() if war.end_time else None,
            "clan": CoCClient._war_clan_to_dict(war.clan) if war.clan else None,
            "opponent": CoCClient._war_clan_to_dict(war.opponent) if war.opponent else None,
        }

    @staticmethod
    def _war_clan_to_dict(war_clan) -> Dict[str, Any]:
        """Convert coc.py WarClan to dict."""
        return {
            "tag": war_clan.tag,
            "name": war_clan.name,
            "badgeUrls": {
                "small": str(war_clan.badge.small) if war_clan.badge else None,
                "large": str(war_clan.badge.large) if war_clan.badge else None,
                "medium": str(war_clan.badge.medium) if war_clan.badge else None,
            } if war_clan.badge else None,
            "clanLevel": war_clan.level,
            "attacks": war_clan.attacks_used,
            "stars": war_clan.stars,
            "destructionPercentage": war_clan.destruction,
            "members": [
                {
                    "tag": member.tag,
                    "name": member.name,
                    "townhallLevel": member.town_hall,
                    "mapPosition": member.map_position,
                    "attacks": [
                        {
                            "attackerTag": attack.attacker_tag,
                            "defenderTag": attack.defender_tag,
                            "stars": attack.stars,
                            "destructionPercentage": attack.destruction,
                            "order": attack.order,
                        }
                        for attack in (member.attacks or [])
                    ],
                    "bestOpponentAttack": {
                        "attackerTag": member.best_opponent_attack.attacker_tag,
                        "defenderTag": member.best_opponent_attack.defender_tag,
                        "stars": member.best_opponent_attack.stars,
                        "destructionPercentage": member.best_opponent_attack.destruction,
                        "order": member.best_opponent_attack.order,
                    } if member.best_opponent_attack else None,
                }
                for member in (war_clan.members or [])
            ],
        }

    async def get_capital_raid_seasons(self, clan_tag: str, limit: int = 10):
        """
        Get clan capital raid seasons.

        Args:
            clan_tag: Clan tag (with or without #)
            limit: Number of seasons to retrieve (max 10)

        Returns:
            List of capital raid seasons
        """
        try:
            await self.login()
        except Exception as e:
            logger.error(f"Login failed for get_capital_raid_seasons: {e}")
            return []

        try:
            normalized_tag = self._normalize_tag(clan_tag)
            # get_raid_log returns a list, not an async iterator
            seasons = await self.client.get_raid_log(normalized_tag, limit=min(limit, 10))
            return list(seasons) if seasons else []
        except coc.NotFound:
            logger.warning(f"Clan not found: {clan_tag}")
            return []
        except Exception as e:
            logger.error(f"Error fetching capital raid seasons for {clan_tag}: {e}")
            return []

    async def get_cwl_group(self, clan_tag: str):
        """
        Get current CWL group information.

        Args:
            clan_tag: Clan tag (with or without #)

        Returns:
            CWL group data or None if not in CWL
        """
        try:
            await self.login()
        except Exception as e:
            logger.error(f"Login failed for get_cwl_group: {e}")
            return None

        try:
            normalized_tag = self._normalize_tag(clan_tag)
            return await self.client.get_league_group(normalized_tag)
        except coc.NotFound:
            logger.warning(f"Clan not found or not in CWL: {clan_tag}")
            return None
        except Exception as e:
            logger.error(f"Error fetching CWL group for {clan_tag}: {e}")
            return None

    async def get_cwl_war(self, war_tag: str):
        """
        Get specific CWL war.

        Args:
            war_tag: War tag

        Returns:
            CWL war data
        """
        try:
            await self.login()
        except Exception as e:
            logger.error(f"Login failed for get_cwl_war: {e}")
            return None

        try:
            return await self.client.get_league_war(war_tag)
        except coc.NotFound:
            logger.warning(f"CWL war not found: {war_tag}")
            return None
        except Exception as e:
            logger.error(f"Error fetching CWL war {war_tag}: {e}")
            return None

    @staticmethod
    def capital_raid_season_to_dict(season) -> Dict[str, Any]:
        """Convert capital raid season to dict."""
        result = {
            "state": getattr(season, 'state', 'ended'),
            "startTime": season.start_time.time.isoformat() if hasattr(season, 'start_time') and season.start_time else None,
            "endTime": season.end_time.time.isoformat() if hasattr(season, 'end_time') and season.end_time else None,
            "capitalTotalLoot": getattr(season, 'total_loot', 0),
            "raidsCompleted": getattr(season, 'completed_raid_count', 0),
            "totalAttacks": getattr(season, 'attack_count', 0),
            "enemyDistrictsDestroyed": getattr(season, 'districts_destroyed', 0),
            "members": [
                {
                    "tag": member.tag,
                    "name": member.name,
                    "attacks": getattr(member, 'attack_count', 0),
                    "attackLimit": getattr(member, 'attack_limit', 6),
                    "bonusAttackLimit": getattr(member, 'bonus_attack_limit', 0),
                    "capitalResourcesLooted": getattr(member, 'capital_resources_looted', 0),
                }
                for member in (season.members if hasattr(season, 'members') else [])
            ],
        }

        # Add attack log if available
        if hasattr(season, 'attack_log') and season.attack_log:
            result["attackLog"] = [
                {
                    "defender": {
                        "tag": getattr(log, 'defender_tag', ''),
                        "name": getattr(log, 'defender_name', ''),
                        "level": getattr(log, 'defender_level', 0),
                        "badgeUrls": {
                            "small": str(log.defender_badge_url.small) if hasattr(log, 'defender_badge_url') and log.defender_badge_url else None,
                            "medium": str(log.defender_badge_url.medium) if hasattr(log, 'defender_badge_url') and log.defender_badge_url else None,
                            "large": str(log.defender_badge_url.large) if hasattr(log, 'defender_badge_url') and log.defender_badge_url else None,
                        } if hasattr(log, 'defender_badge_url') and log.defender_badge_url else None,
                    },
                    "attackCount": getattr(log, 'attack_count', 0),
                    "districtCount": getattr(log, 'district_count', 0),
                    "districtsDestroyed": getattr(log, 'districts_destroyed', 0),
                }
                for log in season.attack_log
            ]

        # Add defense log if available
        if hasattr(season, 'defense_log') and season.defense_log:
            result["defenseLog"] = [
                {
                    "attacker": {
                        "tag": getattr(log, 'attacker_tag', ''),
                        "name": getattr(log, 'attacker_name', ''),
                        "level": getattr(log, 'attacker_level', 0),
                    },
                    "attackCount": getattr(log, 'attack_count', 0),
                    "districtCount": getattr(log, 'district_count', 0),
                    "districtsDestroyed": getattr(log, 'districts_destroyed', 0),
                }
                for log in season.defense_log
            ]

        return result

    @staticmethod
    def cwl_group_to_dict(group) -> Dict[str, Any]:
        """Convert CWL group to dict."""
        if not group:
            return None

        return {
            "state": group.state,
            "season": group.season,
            "clans": [
                {
                    "tag": clan.tag,
                    "name": clan.name,
                    "clanLevel": clan.level,
                    "badgeUrls": {
                        "small": str(clan.badge.small) if clan.badge else None,
                        "medium": str(clan.badge.medium) if clan.badge else None,
                        "large": str(clan.badge.large) if clan.badge else None,
                    } if clan.badge else None,
                    "members": [
                        {
                            "tag": member.tag,
                            "name": member.name,
                            "townHallLevel": member.town_hall,
                        }
                        for member in (clan.members if hasattr(clan, 'members') else [])
                    ],
                }
                for clan in (group.clans if hasattr(group, 'clans') else [])
            ],
            "rounds": [
                {
                    "warTags": [war_tag for war_tag in round_data]
                }
                for round_data in (group.rounds if hasattr(group, 'rounds') else [])
            ] if hasattr(group, 'rounds') else [],
        }
