#!/usr/bin/env python3
"""
Fix clan games start points based on current achievement points and points earned.

This script:
1. Reads the current clan games session
2. Fetches current achievement points for each player from the CoC API
3. Accepts points earned from user input
4. Calculates start_points = current_points - points_earned
5. Updates the clan games session file
"""

import json
import asyncio
import sys
from pathlib import Path

# Add shared to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from shared.utils.coc_client import CoCClient
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

async def fetch_player_achievement_points(coc_client: CoCClient, player_tag: str) -> int:
    """Fetch current Games Champion achievement points for a player."""
    try:
        player = await coc_client.get_player(player_tag)
        if player is None:
            print(f"  WARNING: Could not fetch data for {player_tag}")
            return 0

        # Get only the "Games Champion" achievement (clan games points)
        games_achievement = player.get_achievement("Games Champion")
        if games_achievement:
            return games_achievement.value
        else:
            print(f"  WARNING: No Games Champion achievement for {player_tag}")
            return 0
    except Exception as e:
        print(f"  ERROR fetching {player_tag}: {e}")
        return 0


async def main():
    print("=" * 60)
    print("Clan Games Start Points Fixer")
    print("=" * 60)
    print()

    # Load clan games session
    session_file = Path("data/clan_games/current_session.json")
    if not session_file.exists():
        print(f"ERROR: {session_file} not found!")
        return

    with open(session_file) as f:
        session_data = json.load(f)

    print(f"Loaded session: {session_data['session_id']}")
    print(f"Status: {session_data['status']}")
    print(f"Players: {len(session_data['players'])}")
    print()

    # Initialize CoC client
    email = os.getenv("COC_EMAIL")
    password = os.getenv("COC_PASSWORD")

    if not email or not password:
        print("ERROR: COC_EMAIL and COC_PASSWORD must be set in .env file")
        return

    coc_client = CoCClient(email, password)

    try:
        print("Fetching current achievement points for all players...")
        print()

        # Fetch current points for all players
        player_current_points = {}
        for player_tag, player_data in session_data['players'].items():
            player_name = player_data['player_name']
            print(f"  Fetching: {player_name} ({player_tag})...", end=" ")
            current_points = await fetch_player_achievement_points(coc_client, player_tag)
            player_current_points[player_tag] = current_points
            print(f"{current_points:,} points")

        print()
        print("=" * 60)
        print("Current achievement points fetched!")
        print("=" * 60)
        print()

        # Now get points earned from user
        print("Now I need the points earned by each player in this clan games.")
        print("You can either:")
        print("  1. Enter points earned manually for each player")
        print("  2. Provide a JSON file with points earned")
        print()

        choice = input("Choose option (1 or 2): ").strip()

        points_earned = {}

        player_ranks = {}

        if choice == "1":
            print()
            print("Enter points earned for each player:")
            print("(Press Enter to skip a player / use 0)")
            print()

            for player_tag, player_data in sorted(
                session_data['players'].items(),
                key=lambda x: x[1]['player_name']
            ):
                player_name = player_data['player_name']
                current_in_file = player_data.get('points_earned', 0)

                while True:
                    try:
                        points_input = input(f"  {player_name:30s} (currently {current_in_file:5,}): ").strip()
                        if points_input == "":
                            points = current_in_file
                        else:
                            points = int(points_input)
                        points_earned[player_tag] = points
                        player_ranks[player_tag] = 999  # No rank in manual mode
                        break
                    except ValueError:
                        print("    Invalid input. Please enter a number.")

        elif choice == "2":
            json_file = input("Enter path to JSON file: ").strip()
            with open(json_file) as f:
                data = json.load(f)
                # Handle both simple format {"tag": points} and extended format {"tag": {"points": X, "rank": Y}}
                points_earned = {}
                player_ranks = {}
                for tag, value in data.items():
                    if isinstance(value, dict):
                        points_earned[tag] = value.get("points", 0)
                        player_ranks[tag] = value.get("rank", 999)
                    else:
                        points_earned[tag] = value
                        player_ranks[tag] = 999
        else:
            print("Invalid choice. Exiting.")
            return

        print()
        print("=" * 60)
        print("Calculating and updating start points...")
        print("=" * 60)
        print()

        # Calculate and update start points
        for player_tag, player_data in session_data['players'].items():
            current_api_points = player_current_points.get(player_tag, 0)
            earned_points = points_earned.get(player_tag, 0)

            # Calculate start points
            calculated_start = current_api_points - earned_points

            # Update the data
            old_start = player_data.get('start_points', 0)
            player_data['start_points'] = calculated_start
            player_data['current_points'] = current_api_points
            player_data['points_earned'] = earned_points

            # Add completion rank if available
            if player_tag in player_ranks:
                player_data['completion_rank'] = player_ranks[player_tag]

            player_name = player_data['player_name']
            rank_str = f" (Rank: {player_ranks.get(player_tag, 'N/A')})" if player_tag in player_ranks else ""
            print(f"{player_name:30s}{rank_str}")
            print(f"  Current (API):     {current_api_points:8,}")
            print(f"  Earned (input):    {earned_points:8,}")
            print(f"  Start (old):       {old_start:8,}")
            print(f"  Start (new):       {calculated_start:8,}")
            print()

        # Save backup
        backup_file = session_file.with_suffix('.json.backup')
        with open(backup_file, 'w') as f:
            json.dump(session_data, f, indent=2)
        print(f"Backup saved to: {backup_file}")

        # Save updated file
        with open(session_file, 'w') as f:
            json.dump(session_data, f, indent=2)

        print(f"Updated file saved to: {session_file}")
        print()
        print("=" * 60)
        print("Done!")
        print("=" * 60)

    finally:
        await coc_client.close()


if __name__ == "__main__":
    asyncio.run(main())
