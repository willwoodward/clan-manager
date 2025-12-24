"""CoC API proxy routes - replaces server.js functionality."""

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from ..services.coc_client import coc_client
import logging
import httpx

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/clan/{clan_tag}")
async def get_clan(clan_tag: str):
    """
    Get live clan data from CoC API.

    Args:
        clan_tag: Clan tag (with or without #)

    Returns:
        Clan data including members, war stats, etc.
    """
    try:
        data = await coc_client.get_clan(clan_tag)
        if data is None:
            raise HTTPException(status_code=404, detail="Clan not found")
        return data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching clan {clan_tag}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/clan/{clan_tag}/members")
async def get_clan_members(clan_tag: str):
    """
    Get clan members list.

    Args:
        clan_tag: Clan tag (with or without #)

    Returns:
        List of clan members
    """
    try:
        data = await coc_client.get_clan_members(clan_tag)
        if data is None:
            raise HTTPException(status_code=404, detail="Clan not found")
        return data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching clan members {clan_tag}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/currentwar/{clan_tag}")
async def get_current_war(clan_tag: str):
    """
    Get current war status (live data).

    Args:
        clan_tag: Clan tag (with or without #)

    Returns:
        Current war data if in war, otherwise war status
    """
    try:
        data = await coc_client.get_current_war(clan_tag)
        if data is None:
            raise HTTPException(status_code=404, detail="War data not available")
        return data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching current war for {clan_tag}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/player/{player_tag}")
async def get_player(player_tag: str):
    """
    Get live player data from CoC API.

    Args:
        player_tag: Player tag (with or without #)

    Returns:
        Player data including stats, troops, heroes, etc.
    """
    try:
        data = await coc_client.get_player(player_tag)
        if data is None:
            raise HTTPException(status_code=404, detail="Player not found")
        return data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching player {player_tag}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/clan/{clan_tag}/capitalraidseasons")
async def get_capital_raid_seasons(clan_tag: str, limit: int = 10):
    """
    Get clan capital raid seasons.

    Args:
        clan_tag: Clan tag (with or without #)
        limit: Number of seasons to retrieve (1-10, default 10)

    Returns:
        List of capital raid seasons
    """
    try:
        # Validate limit
        if limit < 1 or limit > 10:
            raise HTTPException(status_code=400, detail="Limit must be between 1 and 10")

        data = await coc_client.get_capital_raid_seasons(clan_tag, limit)
        return {"items": data}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching capital raid seasons for {clan_tag}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/clan/{clan_tag}/currentwar/leaguegroup")
async def get_cwl_group(clan_tag: str):
    """
    Get current CWL group information.

    Args:
        clan_tag: Clan tag (with or without #)

    Returns:
        CWL group data or error if not in CWL
    """
    try:
        data = await coc_client.get_cwl_group(clan_tag)
        if data is None:
            return {"state": "notInWar"}
        return data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching CWL group for {clan_tag}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/clanwarleagues/wars/{war_tag}")
async def get_cwl_war(war_tag: str):
    """
    Get specific CWL war.

    Args:
        war_tag: War tag (URL encoded)

    Returns:
        CWL war data
    """
    try:
        data = await coc_client.get_cwl_war(war_tag)
        if data is None:
            raise HTTPException(status_code=404, detail="CWL war not found")
        return data
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching CWL war {war_tag}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/proxy-image")
async def proxy_image(url: str):
    """
    Proxy images from Clash of Clans API assets to avoid CORS issues.

    Args:
        url: The full URL of the image to proxy

    Returns:
        The image with appropriate content-type header
    """
    try:
        # Validate that the URL is from Clash of Clans API
        if not url.startswith("https://api-assets.clashofclans.com/"):
            raise HTTPException(status_code=400, detail="Invalid image URL")

        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=10.0)
            response.raise_for_status()

            # Get content type from response
            content_type = response.headers.get("content-type", "image/png")

            return Response(
                content=response.content,
                media_type=content_type,
                headers={
                    "Cache-Control": "public, max-age=31536000",  # Cache for 1 year
                }
            )
    except httpx.HTTPStatusError as e:
        logger.error(f"Error fetching image {url}: {e}")
        raise HTTPException(status_code=e.response.status_code, detail="Image not found")
    except Exception as e:
        logger.error(f"Error proxying image {url}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
