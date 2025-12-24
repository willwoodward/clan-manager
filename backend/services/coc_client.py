"""CoC API client for backend - uses shared CoCClient."""

import sys
from pathlib import Path
import logging
from typing import Optional

# Add shared to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from shared.utils import CoCClient
from ..config import settings

logger = logging.getLogger(__name__)


class BackendCoCClient:
    """Backend-specific wrapper that adds API response formatting."""

    def __init__(self, email: str, password: str):
        self.coc_client = CoCClient(email, password)

    async def close(self):
        """Close the underlying CoC client."""
        await self.coc_client.close()

    async def get_clan(self, clan_tag: str) -> Optional[dict]:
        """Get clan information as dict."""
        clan = await self.coc_client.get_clan(clan_tag)
        if clan is None:
            return None
        return CoCClient.clan_to_dict(clan)

    async def get_clan_members(self, clan_tag: str) -> Optional[dict]:
        """Get clan members as dict."""
        clan = await self.coc_client.get_clan(clan_tag)
        if clan is None:
            return None
        clan_dict = CoCClient.clan_to_dict(clan)
        return {"items": clan_dict.get("memberList", [])}

    async def get_current_war(self, clan_tag: str) -> Optional[dict]:
        """Get current war information as dict."""
        war = await self.coc_client.get_current_war(clan_tag)
        if war is None:
            return None
        return CoCClient.war_to_dict(war)

    async def get_player(self, player_tag: str) -> Optional[dict]:
        """Get player information as dict."""
        player = await self.coc_client.get_player(player_tag)
        if player is None:
            return None
        return CoCClient.player_to_dict(player)

    async def get_capital_raid_seasons(self, clan_tag: str, limit: int = 10) -> list:
        """Get capital raid seasons as list of dicts."""
        seasons = await self.coc_client.get_capital_raid_seasons(clan_tag, limit)
        return [CoCClient.capital_raid_season_to_dict(season) for season in seasons]

    async def get_cwl_group(self, clan_tag: str) -> Optional[dict]:
        """Get CWL group as dict."""
        group = await self.coc_client.get_cwl_group(clan_tag)
        if group is None:
            return None
        return CoCClient.cwl_group_to_dict(group)

    async def get_cwl_war(self, war_tag: str) -> Optional[dict]:
        """Get CWL war as dict."""
        war = await self.coc_client.get_cwl_war(war_tag)
        if war is None:
            return None
        return CoCClient.war_to_dict(war)


# Global client instance
coc_client = BackendCoCClient(
    email=settings.coc_email,
    password=settings.coc_password
)
