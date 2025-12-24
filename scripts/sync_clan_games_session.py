"""Sync current clan games session with all clan members.

This script adds any missing clan members to the current session
by snapshotting their current Games Champion points as the baseline.
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import asyncio
import importlib.util

# Import clan games storage
spec = importlib.util.spec_from_file_location(
    "clan_games_storage",
    Path(__file__).parent.parent / "shared" / "utils" / "clan_games_storage.py"
)
clan_games_storage_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(clan_games_storage_module)

ClanGamesStorage = clan_games_storage_module.ClanGamesStorage

# Initialize storage
project_root = Path(__file__).parent.parent
storage = ClanGamesStorage(data_dir=str(project_root / "data" / "clan_games"))


async def main():
    """Sync current session with all clan members."""
    import coc
    from backend.config import settings

    print("Syncing clan games session with all clan members...")

    # Check if there's an active session
    session = storage.get_current_session()
    if not session or session.get("status") != "active":
        print("Error: No active clan games session found")
        return

    print(f"Found active session: {session['session_id']}")
    print(f"Currently tracking {len(session['players'])} players")

    # Login to CoC API
    client = coc.Client()
    try:
        await client.login(settings.coc_email, settings.coc_password)
        print("Logged in to CoC API")

        # Get clan members
        clan = await client.get_clan(settings.clan_tag)
        print(f"Loaded clan: {clan.name} ({len(clan.members)} members)")

        added_count = 0
        updated_count = 0

        # Check each clan member
        for member in clan.members:
            player = await client.get_player(member.tag)
            games_achievement = player.get_achievement("Games Champion")

            if not games_achievement:
                continue

            if member.tag not in session["players"]:
                # New player - add them with current points as baseline
                print(f"  Adding {member.name}: baseline={games_achievement.value:,}")
                added_count += 1

            # Update all players with current points
            storage.update_player_points(
                player_tag=member.tag,
                player_name=member.name,
                new_total_points=games_achievement.value
            )
            updated_count += 1

        print(f"\nSync complete:")
        print(f"  - Added {added_count} new players")
        print(f"  - Updated {updated_count} total players")

        # Show current leaderboard
        leaderboard = storage.get_session_leaderboard()
        participants = [p for p in leaderboard if p.get('points_earned', 0) > 0]

        print(f"\nCurrent Leaderboard ({len(participants)} contributors):")
        for i, player in enumerate(participants[:10], 1):  # Top 10
            print(f"  {i}. {player['player_name']}: {player['points_earned']:,} points")

        await client.close()
        print("\nSession synced successfully!")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        await client.close()


if __name__ == "__main__":
    asyncio.run(main())
