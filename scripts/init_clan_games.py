"""Initialize current clan games session with provided standings."""

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

# Current standings provided by user
# Format: player_name -> points (we'll need to map to tags via API)
CURRENT_STANDINGS = {
    "Chris": 10000,
    "Will Woodward": 10000,
    "Hazzr": 10000,
    "LK": 7750,
    "JW2003": 5000,
    "untouchable": 4200,
    "Thatbeast 21": 4100,
    "up jim": 1600,
    "karlie bro": 950,
    "SkyBlueMan": 450,
}


async def main():
    """Initialize clan games session with current standings."""
    import coc
    from backend.config import settings

    print("Initializing clan games session...")

    # Login to CoC API to get player tags
    client = coc.Client()
    try:
        await client.login(settings.coc_email, settings.coc_password)
        print("Logged in to CoC API")

        # Get clan members
        clan = await client.get_clan(settings.clan_tag)
        print(f"Loaded clan: {clan.name}")

        # Snapshot ALL clan members' current Games Champion points
        # This ensures we have a baseline for everyone, not just current contributors
        initial_standings = {}

        for member in clan.members:
            # Get player details to access achievements
            player = await client.get_player(member.tag)

            # Find Games Champion achievement
            games_achievement = player.get_achievement("Games Champion")
            if games_achievement:
                current_total_points = games_achievement.value

                # If they have already contributed (in CURRENT_STANDINGS), calculate baseline
                if member.name in CURRENT_STANDINGS:
                    points_in_this_games = CURRENT_STANDINGS[member.name]
                    start_points = current_total_points - points_in_this_games
                    print(f"  {member.name} ({member.tag}): "
                          f"Total={current_total_points:,}, "
                          f"InGames={points_in_this_games:,}, "
                          f"Start={start_points:,}")
                else:
                    # Not yet contributed - use current total as baseline
                    start_points = current_total_points
                    print(f"  {member.name} ({member.tag}): "
                          f"Total={current_total_points:,} (baseline)")

                initial_standings[member.tag] = start_points

        print(f"\nSnapshotted {len(initial_standings)} clan members")

        # Start session with initial standings
        session = storage.start_session(initial_standings=initial_standings)
        print(f"\nCreated session: {session['session_id']}")

        # Now update ALL members with current points to calculate earned points
        for member in clan.members:
            player = await client.get_player(member.tag)
            games_achievement = player.get_achievement("Games Champion")
            if games_achievement:
                storage.update_player_points(
                    player_tag=member.tag,
                    player_name=member.name,
                    new_total_points=games_achievement.value
                )

        # Show final leaderboard
        leaderboard = storage.get_session_leaderboard()
        print("\nCurrent Leaderboard:")
        for i, player in enumerate(leaderboard, 1):
            print(f"  {i}. {player['player_name']}: {player['points_earned']:,} points")

        await client.close()
        print("\nSession initialized successfully!")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        await client.close()


if __name__ == "__main__":
    asyncio.run(main())
