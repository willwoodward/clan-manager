"""Background event monitoring service integrated with FastAPI."""

import asyncio
import coc
import sys
from pathlib import Path
from datetime import datetime
import logging

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backend.config import settings

# Import event logger directly
import importlib.util
spec = importlib.util.spec_from_file_location(
    "event_logger",
    Path(__file__).parent.parent.parent / "shared" / "utils" / "event_logger.py"
)
event_logger_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(event_logger_module)

EventLogger = event_logger_module.EventLogger
EventType = event_logger_module.EventType

# Import activity tracker
activity_spec = importlib.util.spec_from_file_location(
    "activity_tracker",
    Path(__file__).parent.parent.parent / "shared" / "utils" / "activity_tracker.py"
)
activity_tracker_module = importlib.util.module_from_spec(activity_spec)
activity_spec.loader.exec_module(activity_tracker_module)

ActivityTracker = activity_tracker_module.ActivityTracker

# Import clan games storage
clan_games_spec = importlib.util.spec_from_file_location(
    "clan_games_storage",
    Path(__file__).parent.parent.parent / "shared" / "utils" / "clan_games_storage.py"
)
clan_games_storage_module = importlib.util.module_from_spec(clan_games_spec)
clan_games_spec.loader.exec_module(clan_games_storage_module)

ClanGamesStorage = clan_games_storage_module.ClanGamesStorage

# Import storage manager
storage_spec = importlib.util.spec_from_file_location(
    "storage",
    Path(__file__).parent.parent.parent / "shared" / "utils" / "storage.py"
)
storage_module = importlib.util.module_from_spec(storage_spec)
storage_spec.loader.exec_module(storage_module)

StorageManager = storage_module.StorageManager

# Import event storage
event_storage_spec = importlib.util.spec_from_file_location(
    "event_storage",
    Path(__file__).parent.parent.parent / "shared" / "utils" / "event_storage.py"
)
event_storage_module = importlib.util.module_from_spec(event_storage_spec)
event_storage_spec.loader.exec_module(event_storage_module)

EventStorage = event_storage_module.EventStorage

logger = logging.getLogger(__name__)

# Initialize event logger, activity tracker, clan games storage, storage manager, and event storage
project_root = Path(__file__).parent.parent.parent
event_logger = EventLogger(data_dir=str(project_root / "data" / "events"))
activity_tracker = ActivityTracker(data_dir=str(project_root / "data" / "activity"))
clan_games_storage = ClanGamesStorage(data_dir=str(project_root / "data" / "clan_games"))
storage_manager = StorageManager(
    use_s3=settings.use_s3,
    s3_bucket=settings.s3_bucket,
    s3_prefix=settings.s3_prefix,
    s3_region=settings.s3_region,
    local_data_dir=str(project_root / "data")
)
event_storage = EventStorage(data_dir=str(project_root / "data"))

# Global client and tasks
client = coc.EventsClient()
monitor_task = None
war_check_task = None
legend_check_task = None
cwl_check_task = None
previous_war_state = None
tracked_player_tags = set()
last_saved_war = None  # Track last war we saved to avoid duplicates


# War data fetching helper functions
async def fetch_player_war_data(player_tag: str) -> dict:
    """Fetch detailed player data for war storage."""
    try:
        player = await client.get_player(player_tag)

        return {
            "tag": player.tag,
            "name": player.name,
            "town_hall": player.town_hall,
            "town_hall_weapon": player.town_hall_weapon,
            "exp_level": player.exp_level,
            "trophies": player.trophies,
            "best_trophies": player.best_trophies,
            "war_stars": player.war_stars,
            "attack_wins": player.attack_wins,
            "defense_wins": player.defense_wins,
            "builder_hall": player.builder_hall,
            "builder_base_trophies": player.builder_base_trophies,
            "best_builder_base_trophies": player.best_builder_base_trophies,
            "role": player.role.name if player.role else None,
            "war_opted_in": player.war_opted_in,
            "donations": player.donations,
            "received": player.received,
            "clan_capital_contributions": player.clan_capital_contributions,
            "clan": {
                "tag": player.clan.tag,
                "name": player.clan.name,
                "level": player.clan.level,
            } if player.clan else None,
            "league": {
                "id": player.league.id,
                "name": player.league.name,
            } if player.league else None,
        }
    except Exception as e:
        logger.error(f"Error fetching player {player_tag} for war data: {e}")
        return None


async def save_war_data(war):
    """Fetch and save detailed war data."""
    global last_saved_war

    try:
        # Generate unique war identifier to avoid duplicates
        war_identifier = f"{war.clan.tag}_{war.opponent.tag}_{war.start_time.time.isoformat() if war.start_time else 'unknown'}"

        # Check if we already saved this war
        if last_saved_war == war_identifier:
            logger.info(f"War data already saved for {war.clan.name} vs {war.opponent.name}")
            return

        logger.info(f"Fetching detailed war data for {war.clan.name} vs {war.opponent.name}")

        # Serialize war data
        war_data = {
            "state": str(war.state),
            "team_size": war.team_size,
            "clan_tag": war.clan.tag,
            "clan_name": war.clan.name,
            "clan_level": war.clan.level,
            "opponent_tag": war.opponent.tag,
            "opponent_name": war.opponent.name,
            "opponent_level": war.opponent.level,
            "start_time": war.start_time.time.isoformat() if war.start_time else None,
            "end_time": war.end_time.time.isoformat() if war.end_time else None,
            "preparation_start_time": war.preparation_start_time.time.isoformat() if war.preparation_start_time else None,
            "clan_stars": war.clan.stars,
            "clan_destruction": war.clan.destruction,
            "clan_attacks_used": war.clan.attacks_used,
            "clan_exp_earned": war.clan.exp_earned,
            "opponent_stars": war.opponent.stars,
            "opponent_destruction": war.opponent.destruction,
            "opponent_attacks_used": war.opponent.attacks_used,
            "opponent_exp_earned": war.opponent.exp_earned,
            "attacks": [
                {
                    "attacker_tag": attack.attacker_tag,
                    "defender_tag": attack.defender_tag,
                    "stars": attack.stars,
                    "destruction": attack.destruction,
                    "order": attack.order,
                }
                for attack in war.attacks
            ] if war.attacks else [],
            "clan_members": [],
            "opponent_members": [],
            "fetched_at": datetime.now().isoformat()
        }

        # Fetch detailed player data for clan members
        logger.info(f"Fetching clan member details ({len(war.clan.members)} players)...")
        clan_member_tasks = [fetch_player_war_data(member.tag) for member in war.clan.members]
        clan_players_data = await asyncio.gather(*clan_member_tasks)

        # Add war-specific info to player data
        for i, member in enumerate(war.clan.members):
            if clan_players_data[i]:
                player_data = clan_players_data[i].copy()
                player_data["war_map_position"] = member.map_position
                player_data["war_town_hall"] = member.town_hall
                war_data["clan_members"].append(player_data)

        # Fetch detailed player data for opponent members
        logger.info(f"Fetching opponent member details ({len(war.opponent.members)} players)...")
        opponent_member_tasks = [fetch_player_war_data(member.tag) for member in war.opponent.members]
        opponent_players_data = await asyncio.gather(*opponent_member_tasks)

        # Add war-specific info to player data
        for i, member in enumerate(war.opponent.members):
            if opponent_players_data[i]:
                player_data = opponent_players_data[i].copy()
                player_data["war_map_position"] = member.map_position
                player_data["war_town_hall"] = member.town_hall
                war_data["opponent_members"].append(player_data)

        # Generate war ID
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        war_id = f"war_{str(war.state).replace(' ', '_')}_{timestamp}"

        # Save using storage manager
        storage_path = await storage_manager.save_war_data(
            war_data=war_data,
            war_id=war_id
        )

        # Mark this war as saved
        last_saved_war = war_identifier

        # Track war attacks as activity points
        try:
            # Count attacks per player from our clan
            attack_counts = {}
            for attack in (war.attacks or []):
                # Check if this attack was by one of our clan members
                attacker_in_clan = any(m.tag == attack.attacker_tag for m in war.clan.members)
                if attacker_in_clan:
                    if attack.attacker_tag not in attack_counts:
                        attack_counts[attack.attacker_tag] = 0
                    attack_counts[attack.attacker_tag] += 1

            # Update activity tracker for each attacker
            for attacker_tag, attack_count in attack_counts.items():
                # Find attacker name from clan members
                attacker_name = next(
                    (m.name for m in war.clan.members if m.tag == attacker_tag),
                    "Unknown"
                )

                # Track each attack separately for proper activity scoring
                for _ in range(attack_count):
                    activity_tracker.update_activity(
                        player_tag=attacker_tag,
                        player_name=attacker_name,
                        activity_type="attack",
                        metadata={"attack_type": "cwl" if war.is_cwl else "war"}
                    )

                logger.info(f"Tracked {attack_count} war attacks for {attacker_name}")

        except Exception as e:
            logger.error(f"Error tracking war attacks as activity: {e}")

        logger.info(f"War data saved successfully: {storage_path}")
        logger.info(f"  War: {war.clan.name} vs {war.opponent.name}")
        logger.info(f"  Score: {war.clan.stars}-{war.opponent.stars} stars, {war.clan.destruction:.2f}%-{war.opponent.destruction:.2f}% destruction")

    except Exception as e:
        logger.error(f"Error saving war data: {e}")
        import traceback
        traceback.print_exc()


# Register event handlers at module level
@client.event
@coc.ClanEvents.member_join()
async def on_member_join(member, clan):
    """Track when a member joins the clan."""
    logger.info(f"Member joined: {member.name}")
    event_logger.log_event(
        EventType.MEMBER_JOIN,
        "New Member Joined",
        f"{member.name} joined the clan",
        {
            "player_tag": member.tag,
            "player_name": member.name,
            "th_level": member.town_hall,
        }
    )
    # Add new member to donation tracking
    if client and member.tag not in tracked_player_tags:
        tracked_player_tags.add(member.tag)
        client.add_player_updates(member.tag)
        logger.info(f"Started tracking donations for new member {member.tag}")

@client.event
@coc.ClanEvents.member_leave()
async def on_member_leave(member, clan):
    """Track when a member leaves the clan."""
    logger.info(f"Member left: {member.name}")
    event_logger.log_event(
        EventType.MEMBER_LEAVE,
        "Member Left",
        f"{member.name} left the clan",
        {
            "player_tag": member.tag,
            "player_name": member.name,
        }
    )
    # Remove member from donation tracking
    if member.tag in tracked_player_tags:
        tracked_player_tags.discard(member.tag)
        logger.info(f"Removed {member.tag} from donation tracking")
        logger.info(f"Currently tracking {len(tracked_player_tags)} players")

@client.event
@coc.ClanEvents.level_change()
async def on_clan_level_change(old_level, new_level, clan):
    """Track when clan levels up."""
    logger.info(f"Clan leveled up: {old_level} -> {new_level}")
    event_logger.log_event(
        EventType.CLAN_LEVEL_UP,
        "Clan Level Up!",
        f"Clan reached level {new_level}",
        {
            "old_level": old_level,
            "new_level": new_level,
        }
    )

@client.event
@coc.ClientEvents.clan_games_start()
async def on_clan_games_start():
    """Automatically start clan games session when games begin."""
    logger.info("Clan Games started - initializing session")

    try:
        # Check if session already exists
        current_session = clan_games_storage.get_current_session()
        if current_session and current_session.get("status") == "active":
            logger.warning("Clan games session already active - skipping initialization")
            return

        # Get all clan members and snapshot their Games Champion points
        clan = await client.get_clan(settings.clan_tag)
        logger.info(f"Snapshotting {len(clan.members)} clan members for clan games")

        initial_standings = {}
        for member in clan.members:
            try:
                player = await client.get_player(member.tag)
                games_achievement = player.get_achievement("Games Champion")
                if games_achievement:
                    initial_standings[member.tag] = games_achievement.value
            except Exception as e:
                logger.error(f"Error getting Games Champion for {member.tag}: {e}")

        # Start new session
        session = clan_games_storage.start_session(initial_standings=initial_standings)
        logger.info(f"Created clan games session: {session['session_id']} with {len(initial_standings)} players")

        # Log event
        event_logger.log_event(
            "CLAN_GAMES_START",
            "🎮 Clan Games Started",
            f"Clan Games have begun! Tracking {len(initial_standings)} members",
            {
                "session_id": session['session_id'],
                "members_tracked": len(initial_standings),
            }
        )

    except Exception as e:
        logger.error(f"Error starting clan games session: {e}")

@client.event
@coc.ClientEvents.clan_games_end()
async def on_clan_games_end():
    """Automatically end clan games session when games complete."""
    logger.info("Clan Games ended - finalizing session")

    try:
        # Get current session
        current_session = clan_games_storage.get_current_session()
        if not current_session or current_session.get("status") != "active":
            logger.warning("No active clan games session to end")
            return

        # Get clan size for participation rate calculation
        clan = await client.get_clan(settings.clan_tag)

        # End session
        completed_session = clan_games_storage.end_session(clan_size=len(clan.members))

        if completed_session:
            total_points = completed_session['summary']['total_points']
            participants = completed_session['summary']['participants']

            logger.info(f"Ended clan games session: {participants} participants, {total_points:,} total points")

            # Log event
            event_logger.log_event(
                "CLAN_GAMES_END",
                "🏆 Clan Games Completed",
                f"Clan Games ended! {participants} members earned {total_points:,} total points",
                {
                    "session_id": completed_session['session_id'],
                    "total_points": total_points,
                    "participants": participants,
                    "participation_rate": completed_session['summary']['participation_rate'],
                }
            )

    except Exception as e:
        logger.error(f"Error ending clan games session: {e}")

@client.event
@coc.PlayerEvents.donations()
async def on_player_donations(old_player, new_player):
    """Track donations for all players."""
    donation_amount = new_player.donations - old_player.donations

    # Log every donation (even small ones)
    if donation_amount > 0:
        logger.info(f"Donation: {new_player.name} donated {donation_amount} troops (total: {new_player.donations})")

        # Update activity tracker
        activity_tracker.update_activity(
            player_tag=new_player.tag,
            player_name=new_player.name,
            activity_type="donation",
            metadata={
                "amount": donation_amount,
                "total_donations": new_player.donations
            }
        )

        event_logger.log_event(
            EventType.DONATION_MILESTONE,
            f"{new_player.name} Donated",
            f"{new_player.name} donated {donation_amount} troops (total: {new_player.donations:,} this season)",
            {
                "player_tag": new_player.tag,
                "player_name": new_player.name,
                "amount": donation_amount,
                "total_donations": new_player.donations,
                "old_donations": old_player.donations,
            }
        )

    # Also check for major milestones
    milestones = [1000, 2000, 3000, 4000, 5000, 10000]
    for milestone in milestones:
        if old_player.donations < milestone <= new_player.donations:
            logger.info(f"Milestone: {new_player.name} reached {milestone}")
            event_logger.log_event(
                EventType.DONATION_MILESTONE,
                "🎯 Donation Milestone",
                f"{new_player.name} reached {milestone:,} donations this season!",
                {
                    "player_tag": new_player.tag,
                    "player_name": new_player.name,
                    "donations": new_player.donations,
                    "milestone": milestone,
                }
            )


@client.event
@coc.PlayerEvents.received()
async def on_player_received(old_player, new_player):
    """Track troops received for all players."""
    received_amount = new_player.received - old_player.received

    if received_amount > 0:
        logger.info(f"Received: {new_player.name} received {received_amount} troops (total: {new_player.received})")

        # Update activity tracker
        activity_tracker.update_activity(
            player_tag=new_player.tag,
            player_name=new_player.name,
            activity_type="received",
            metadata={
                "amount": received_amount,
                "total_received": new_player.received
            }
        )


@client.event
@coc.PlayerEvents.achievements()
async def on_player_achievement(old_player, new_player):
    """Track achievement changes (for attack activity detection)."""
    # Only track dark elixir looting
    loot_achievements = {
        "Heroic Heist": "dark elixir"
    }

    attack_achievements = {
        "Conqueror": "attack_wins",
        "War Hero": "war_stars"
    }

    builder_base_achievements = {
        "Un-Build It": "builder_hall_destructions",
        "Champion Builder": "versus_battle_wins"
    }

    clan_games_achievements = {
        "Games Champion": "clan_games_points"
    }

    event_logged = False

    # Check for attack wins first (prioritize this over dark elixir loot)
    for achievement_name, attack_type in attack_achievements.items():
        old_ach = old_player.get_achievement(achievement_name)
        new_ach = new_player.get_achievement(achievement_name)

        if old_ach and new_ach and new_ach.value > old_ach.value:
            wins_gained = new_ach.value - old_ach.value
            logger.info(f"Attack activity: {new_player.name} {attack_type}")

            # Update activity tracker
            activity_tracker.update_activity(
                player_tag=new_player.tag,
                player_name=new_player.name,
                activity_type="attack",
                metadata={
                    "attack_type": attack_type,
                    "old_value": old_ach.value,
                    "new_value": new_ach.value,
                    "wins_gained": wins_gained
                }
            )

            # Log attack event
            event_logger.log_event(
                "ATTACK",
                f"⚔️ {new_player.name} won",
                f"{new_player.name} won {wins_gained} attack{'s' if wins_gained > 1 else ''}",
                {
                    "player_tag": new_player.tag,
                    "player_name": new_player.name,
                    "attack_type": attack_type,
                    "wins_gained": wins_gained,
                }
            )
            event_logged = True
            break

    # Only check dark elixir loot if we didn't already log an attack win event
    if not event_logged:
        for achievement_name, loot_type in loot_achievements.items():
            old_ach = old_player.get_achievement(achievement_name)
            new_ach = new_player.get_achievement(achievement_name)

            if old_ach and new_ach and new_ach.value > old_ach.value:
                loot_amount = new_ach.value - old_ach.value
                logger.info(f"Attack activity: {new_player.name} looted {loot_type}")

                # Update activity tracker
                activity_tracker.update_activity(
                    player_tag=new_player.tag,
                    player_name=new_player.name,
                    activity_type="attack",
                    metadata={
                        "loot_type": loot_type,
                        "old_value": old_ach.value,
                        "new_value": new_ach.value,
                        "loot_amount": loot_amount
                    }
                )

                # Log attack event
                event_logger.log_event(
                    "ATTACK",
                    f"⚔️ {new_player.name} attacked",
                    f"{new_player.name} attacked",
                    {
                        "player_tag": new_player.tag,
                        "player_name": new_player.name,
                        "loot_type": loot_type,
                        "loot_amount": loot_amount,
                    }
                )
                event_logged = True
                break

    # Check builder base attacks if we didn't already log an event
    if not event_logged:
        for achievement_name, bb_type in builder_base_achievements.items():
            old_ach = old_player.get_achievement(achievement_name)
            new_ach = new_player.get_achievement(achievement_name)

            if old_ach and new_ach and new_ach.value > old_ach.value:
                bb_attacks = new_ach.value - old_ach.value
                logger.info(f"Builder base activity: {new_player.name} {bb_type}")

                # Update activity tracker
                activity_tracker.update_activity(
                    player_tag=new_player.tag,
                    player_name=new_player.name,
                    activity_type="builder_base_attack",
                    metadata={
                        "bb_type": bb_type,
                        "old_value": old_ach.value,
                        "new_value": new_ach.value,
                        "attacks": bb_attacks
                    }
                )

                # Log builder base attack event
                event_logger.log_event(
                    "BUILDER_BASE_ATTACK",
                    f"🏗️ {new_player.name} attacked on builder base",
                    f"{new_player.name} attacked on builder base",
                    {
                        "player_tag": new_player.tag,
                        "player_name": new_player.name,
                        "bb_type": bb_type,
                        "attacks": bb_attacks,
                    }
                )
                event_logged = True
                break

    # Check clan games participation (always log, even if other events occurred)
    for achievement_name, cg_type in clan_games_achievements.items():
        old_ach = old_player.get_achievement(achievement_name)
        new_ach = new_player.get_achievement(achievement_name)

        if old_ach and new_ach and new_ach.value > old_ach.value:
            points_gained = new_ach.value - old_ach.value
            logger.info(f"Clan games activity: {new_player.name} earned {points_gained} points")

            # Update clan games storage (tracks session progress)
            clan_games_storage.update_player_points(
                player_tag=new_player.tag,
                player_name=new_player.name,
                new_total_points=new_ach.value
            )

            # Update activity tracker
            activity_tracker.update_activity(
                player_tag=new_player.tag,
                player_name=new_player.name,
                activity_type="clan_games",
                metadata={
                    "points_gained": points_gained,
                    "total_points": new_ach.value,
                    "old_points": old_ach.value,
                }
            )

            # Log clan games event
            event_logger.log_event(
                "CLAN_GAMES",
                f"🎮 {new_player.name} contributed to clan games",
                f"{new_player.name} earned {points_gained:,} clan games points",
                {
                    "player_tag": new_player.tag,
                    "player_name": new_player.name,
                    "points_gained": points_gained,
                    "total_points": new_ach.value,
                }
            )
            break


# ============================================================================
# Season, CWL, Legend, and Capital Raid Event Handlers
# ============================================================================

@client.event
@coc.ClientEvents.season_end()
async def on_season_end():
    """Capture player stats at season end (last Monday of month)."""
    try:
        season_id = datetime.now().strftime("%Y-%m")

        # Check if we already processed this season
        state = event_storage.get_state("season_end")
        if state and state.get("last_season") == season_id:
            logger.info(f"Season {season_id} already processed")
            return

        logger.info(f"Processing season end for {season_id}")

        clan = await client.get_clan(settings.clan_tag)

        season_data = {
            "season_id": season_id,
            "end_time": datetime.now().isoformat(),
            "clan_name": clan.name,
            "clan_level": clan.level,
            "players": []
        }

        # Fetch all player data
        for member in clan.members:
            try:
                player = await client.get_player(member.tag)
                season_data["players"].append({
                    "tag": player.tag,
                    "name": player.name,
                    "trophies": player.trophies,
                    "best_trophies": player.best_trophies,
                    "war_stars": player.war_stars,
                    "attack_wins": player.attack_wins,
                    "defense_wins": player.defense_wins,
                    "donations": player.donations,
                    "received": player.received,
                    "league": player.league.name if player.league else None,
                    "town_hall": player.town_hall,
                    "builder_hall": player.builder_hall,
                    "exp_level": player.exp_level,
                })
            except Exception as e:
                logger.error(f"Error fetching player {member.tag} for season end: {e}")

        # Save season data
        event_storage.save_season_data(season_data)

        # Update state to prevent duplicate processing
        event_storage.save_state("season_end", {"last_season": season_id})

        logger.info(f"Saved season {season_id} data with {len(season_data['players'])} players")

        # Log event
        event_logger.log_event(
            "SEASON_END",
            "📅 Season Ended",
            f"Season {season_id} completed! Captured stats for {len(season_data['players'])} players",
            {
                "season_id": season_id,
                "player_count": len(season_data["players"]),
            }
        )

    except Exception as e:
        logger.error(f"Error processing season end: {e}")
        import traceback
        traceback.print_exc()


@client.event
@coc.ClientEvents.raid_weekend_end()
async def on_raid_weekend_end():
    """Capture capital raid weekend results."""
    try:
        raid_id = f"raid_{datetime.now().strftime('%Y-W%U')}"

        # Check if we already processed this raid
        state = event_storage.get_state("capital_raid")
        if state and state.get("last_raid") == raid_id:
            logger.info(f"Raid {raid_id} already processed")
            return

        logger.info(f"Processing capital raid weekend end: {raid_id}")

        clan = await client.get_clan(settings.clan_tag)

        raid_data = {
            "raid_id": raid_id,
            "end_time": datetime.now().isoformat(),
            "clan_name": clan.name,
            "clan_tag": clan.tag,
            "clan_level": clan.level,
            "capital_hall_level": clan.capital_hall,
            "total_capital_loot": 0,
            "raids_completed": 0,
            "attacks_used": 0,
        }

        # Try to get raid log
        try:
            raid_log = await client.get_raid_log(settings.clan_tag)
            if raid_log and len(raid_log) > 0:
                latest_raid = raid_log[0]
                raid_data.update({
                    "total_capital_loot": latest_raid.capital_total_loot,
                    "raids_completed": latest_raid.raids_completed,
                    "attacks_used": latest_raid.total_attacks,
                    "state": latest_raid.state.value if latest_raid.state else "ended",
                    "attack_log": [
                        {
                            "attacker_tag": attack.attacker.tag,
                            "attacker_name": attack.attacker.name,
                            "district_id": attack.district_id,
                            "districts_destroyed": attack.districts_destroyed,
                            "district_attack_count": attack.district_attack_count,
                        }
                        for attack in latest_raid.attack_log
                    ] if hasattr(latest_raid, 'attack_log') else []
                })
        except Exception as e:
            logger.warning(f"Could not fetch raid log: {e}")

        # Save raid data
        event_storage.save_capital_raid(raid_data)

        # Track capital raid attacks as activity points
        try:
            # Count attacks per player
            attack_counts = {}
            for attack in raid_data.get("attack_log", []):
                attacker_tag = attack.get("attacker_tag")
                attacker_name = attack.get("attacker_name")

                if attacker_tag:
                    if attacker_tag not in attack_counts:
                        attack_counts[attacker_tag] = {
                            "count": 0,
                            "name": attacker_name or "Unknown"
                        }
                    attack_counts[attacker_tag]["count"] += 1

            # Update activity tracker for each attacker
            for attacker_tag, data in attack_counts.items():
                # Track each attack separately for proper activity scoring
                for _ in range(data["count"]):
                    activity_tracker.update_activity(
                        player_tag=attacker_tag,
                        player_name=data["name"],
                        activity_type="attack",
                        metadata={"attack_type": "raid"}
                    )

                logger.info(f"Tracked {data['count']} capital raid attacks for {data['name']}")

        except Exception as e:
            logger.error(f"Error tracking capital raid attacks as activity: {e}")

        # Update state
        event_storage.save_state("capital_raid", {"last_raid": raid_id})

        logger.info(f"Saved capital raid {raid_id}: {raid_data.get('total_capital_loot', 0):,} capital loot")

        # Log event
        event_logger.log_event(
            "CAPITAL_RAID_END",
            "🏰 Raid Weekend Ended",
            f"Raid Weekend completed! Earned {raid_data.get('total_capital_loot', 0):,} capital gold",
            {
                "raid_id": raid_id,
                "capital_loot": raid_data.get("total_capital_loot", 0),
                "raids_completed": raid_data.get("raids_completed", 0),
            }
        )

    except Exception as e:
        logger.error(f"Error processing capital raid end: {e}")
        import traceback
        traceback.print_exc()


async def check_league_reset():
    """Check for league reset (every Monday 4:55 AM UTC - 5 mins before actual reset)."""
    while True:
        try:
            from datetime import datetime, timezone

            now = datetime.now(timezone.utc)

            # Check if it's Monday (weekday 0) at 4:55 AM UTC (5 mins before reset)
            if now.weekday() == 0 and now.hour == 4 and now.minute == 55:
                reset_id = now.strftime("%Y-W%U")

                # Check if we already processed this reset
                state = event_storage.get_state("league_reset")
                if state and state.get("last_reset") == reset_id:
                    logger.debug(f"League reset {reset_id} already processed")
                else:
                    logger.info(f"Processing league reset (all players): {reset_id}")

                    clan = await client.get_clan(settings.clan_tag)

                    # Track ALL players (not just legend)
                    all_players = []
                    legend_count = 0

                    for member in clan.members:
                        try:
                            player = await client.get_player(member.tag)
                            player_data = {
                                "tag": player.tag,
                                "name": player.name,
                                "trophies": player.trophies,
                                "best_trophies": player.best_trophies,
                                "league": player.league.name if player.league else "Unranked",
                                "town_hall": player.town_hall,
                            }

                            # Add legend statistics if in legend league (5000+ trophies)
                            if player.trophies >= 5000:
                                legend_count += 1
                                if player.legend_statistics:
                                    player_data["legend_statistics"] = {
                                        "previous_season": player.legend_statistics.previous_season.trophies if hasattr(player.legend_statistics, 'previous_season') and player.legend_statistics.previous_season else None,
                                        "best_season": player.legend_statistics.best_season.trophies if hasattr(player.legend_statistics, 'best_season') and player.legend_statistics.best_season else None,
                                    }

                            all_players.append(player_data)
                        except Exception as e:
                            logger.error(f"Error fetching player {member.tag} for league reset: {e}")

                    if all_players:
                        reset_data = {
                            "reset_id": reset_id,
                            "reset_date": now.strftime("%Y-%m-%d"),
                            "timestamp": now.isoformat(),
                            "total_players": len(all_players),
                            "legend_players": legend_count,
                            "players": all_players
                        }
                        event_storage.save_legend_reset(reset_data)

                        # Update state
                        event_storage.save_state("league_reset", {"last_reset": reset_id})

                        logger.info(f"Saved league reset {reset_id}: {len(all_players)} total players ({legend_count} in legend)")

                        # Log event
                        event_logger.log_event(
                            "LEAGUE_RESET",
                            "🏅 League Reset",
                            f"Tracked {len(all_players)} players ({legend_count} legend)",
                            {
                                "reset_id": reset_id,
                                "player_count": len(all_players),
                                "legend_count": legend_count,
                            }
                        )
                    else:
                        logger.info(f"No players found for league reset {reset_id}")

        except Exception as e:
            logger.error(f"Error checking league reset: {e}")

        # Check every minute between 4:50-5:10 AM on Mondays, otherwise every hour
        if now.weekday() == 0 and 4 <= now.hour <= 5:
            await asyncio.sleep(60)  # Check every minute during reset window
        else:
            await asyncio.sleep(3600)  # Check every hour otherwise


async def check_war_state():
    """Check war state periodically."""
    global previous_war_state

    while True:
        try:
            war = await client.get_current_war(settings.clan_tag)

            if war.state != previous_war_state:
                if war.state == "inWar":
                    logger.info("War started")
                    event_logger.log_event(
                        EventType.WAR_START,
                        "War Started",
                        f"War against {war.opponent.name} is now active",
                        {
                            "opponent_tag": war.opponent.tag,
                            "opponent_name": war.opponent.name,
                            "team_size": war.team_size,
                        }
                    )
                elif previous_war_state == "inWar" and war.state == "warEnded":
                    logger.info("War ended")

                    # Save detailed war data
                    await save_war_data(war)

                    # Check if this is a CWL war and save separately
                    if war.is_cwl:
                        try:
                            logger.info(f"CWL war detected - saving CWL data with full attack details")

                            # Import coc_client for converter
                            from shared.utils.coc_client import coc_client

                            # Get current CWL season ID
                            try:
                                league_group = await coc_client.get_cwl_group(settings.clan_tag)
                                season_id = league_group.season if league_group else datetime.now().strftime("%Y-%m")
                            except:
                                season_id = datetime.now().strftime("%Y-%m")

                            # Convert war to dict with full attack details
                            war_dict = coc_client.cwl_war_to_dict(war)
                            if war_dict:
                                war_data = {
                                    **war_dict,
                                    "season_id": season_id,
                                    "fetched_at": datetime.now().isoformat(),
                                }

                                war_tag = war.war_tag if hasattr(war, 'war_tag') else f"cwl_{int(datetime.now().timestamp())}"
                                await storage_manager.save_cwl_war(war_data, war_tag)
                                logger.info(f"Saved CWL war with full attack details: {war.clan.name} vs {war.opponent.name}")

                                event_logger.log_event(
                                    "CWL_WAR_END",
                                    "🏆 CWL War Ended",
                                    f"CWL war vs {war.opponent.name}: {war.clan.stars}-{war.opponent.stars} stars",
                                    {
                                        "war_tag": war_tag,
                                        "season_id": season_id,
                                        "opponent_name": war.opponent.name,
                                        "our_stars": war.clan.stars,
                                        "their_stars": war.opponent.stars,
                                        "is_cwl": True,
                                    }
                                )
                        except Exception as e:
                            logger.error(f"Error saving CWL war data: {e}")

                    # Check if we won
                    if war.clan.stars > war.opponent.stars:
                        event_logger.log_event(
                            EventType.WAR_WON,
                            "War Victory!",
                            f"Defeated {war.opponent.name} with {war.clan.stars} stars to {war.opponent.stars}",
                            {
                                "opponent_name": war.opponent.name,
                                "our_stars": war.clan.stars,
                                "their_stars": war.opponent.stars,
                                "our_destruction": war.clan.destruction,
                                "their_destruction": war.opponent.destruction,
                            }
                        )
                    elif war.clan.stars < war.opponent.stars:
                        event_logger.log_event(
                            EventType.WAR_LOST,
                            "War Defeat",
                            f"Lost to {war.opponent.name} with {war.clan.stars} stars to {war.opponent.stars}",
                            {
                                "opponent_name": war.opponent.name,
                                "our_stars": war.clan.stars,
                                "their_stars": war.opponent.stars,
                            }
                        )
                    else:
                        event_logger.log_event(
                            EventType.WAR_END,
                            "War Tied",
                            f"Tied with {war.opponent.name} at {war.clan.stars} stars each",
                            {
                                "opponent_name": war.opponent.name,
                                "stars": war.clan.stars,
                            }
                        )

                previous_war_state = war.state

        except coc.PrivateWarLog:
            logger.warning("War log is private")
        except Exception as e:
            logger.error(f"Error checking war state: {e}")

        # Check every 5 minutes
        await asyncio.sleep(300)


async def check_cwl_state():
    """Check CWL state and sync data during active CWL."""
    # Import coc_client for CWL methods
    from shared.utils.coc_client import coc_client

    last_cwl_check = None

    while True:
        try:
            # Check CWL once per day (or every 6 hours during active CWL)
            now = datetime.now()

            # Try to get current CWL group
            league_group = await coc_client.get_cwl_group(settings.clan_tag)

            if league_group:
                # CWL is active!
                season_id = league_group.season  # Format: "YYYY-MM"
                logger.info(f"CWL is active - Season {season_id}")

                # Convert league group to dict
                group_data = coc_client.cwl_group_to_dict(league_group)

                # Get clan info for league tier
                clan_data = await coc_client.get_clan(settings.clan_tag)
                league_name = clan_data.war_league.name if clan_data and clan_data.war_league else "Unranked"

                # Determine current round by checking which rounds have war tags
                rounds_data = group_data.get("rounds", [])
                current_round = 0
                for i, round_info in enumerate(rounds_data):
                    if round_info.get("warTags"):
                        current_round = i + 1

                # Collect all war tags from all rounds
                all_war_tags = []
                for round_info in rounds_data:
                    for war_tag in round_info.get("warTags", []):
                        if war_tag and war_tag != "#0":  # Skip placeholder tags
                            all_war_tags.append(war_tag)

                logger.info(f"Found {len(all_war_tags)} CWL wars in {len(rounds_data)} rounds")

                # Fetch and store each war
                wars_saved = 0
                wars_won = 0
                wars_lost = 0
                total_stars = 0
                total_destruction = 0

                for war_tag in all_war_tags:
                    try:
                        # Check if we already have this war
                        existing_war = await storage_manager.get_cwl_war(war_tag)
                        if existing_war:
                            # Update stats from existing war
                            war_data = existing_war
                        else:
                            # Fetch new war data
                            war = await coc_client.get_cwl_war(war_tag)
                            if not war:
                                continue

                            # Convert to dict with full attack details
                            war_dict = coc_client.cwl_war_to_dict(war)
                            if not war_dict:
                                continue

                            # Add metadata
                            war_data = {
                                **war_dict,
                                "season_id": season_id,
                                "fetched_at": datetime.now().isoformat(),
                            }

                            # Save CWL war
                            await storage_manager.save_cwl_war(war_data, war_tag)
                            logger.info(f"Saved CWL war: {war_tag}")
                            wars_saved += 1

                        # Aggregate stats (only if war is from our clan)
                        if war_data and war_data.get("clan", {}).get("tag") == settings.clan_tag:
                            clan_stars = war_data.get("clan", {}).get("stars", 0)
                            opponent_stars = war_data.get("opponent", {}).get("stars", 0)
                            total_stars += clan_stars
                            total_destruction += war_data.get("clan", {}).get("destructionPercentage", 0)

                            if clan_stars > opponent_stars:
                                wars_won += 1
                            elif clan_stars < opponent_stars:
                                wars_lost += 1

                    except Exception as e:
                        logger.error(f"Error fetching/saving CWL war {war_tag}: {e}")

                # Calculate final rank and determine promotion/demotion
                # This can only be determined after all 7 wars are complete
                is_complete = len(all_war_tags) >= 7 and current_round >= 7

                # Save/update season data
                season_data = {
                    "season_id": season_id,
                    "clan_tag": settings.clan_tag,
                    "start_time": None,  # CWL doesn't provide exact start time in API
                    "end_time": None if not is_complete else datetime.now().isoformat(),
                    "league_start": league_name,
                    "league_end": league_name,  # Will be updated after season ends
                    "total_stars": total_stars,
                    "total_destruction": total_destruction,
                    "wars_won": wars_won,
                    "wars_lost": wars_lost,
                    "wars_tied": len(all_war_tags) - wars_won - wars_lost,
                    "final_rank": None,  # Cannot determine from API
                    "group_clans": [clan["tag"] for clan in group_data.get("clans", [])],
                    "promoted": False,  # Will be updated after season ends
                    "demoted": False,
                    "status": "complete" if is_complete else "active",
                    "last_updated": datetime.now().isoformat(),
                }

                await storage_manager.save_cwl_season(season_data, season_id)
                logger.info(f"Updated CWL season {season_id}: {wars_won}-{wars_lost} ({total_stars} stars)")

                if wars_saved > 0:
                    event_logger.log_event(
                        "CWL_DATA_SYNC",
                        "CWL Data Synced",
                        f"Saved {wars_saved} CWL wars for season {season_id}",
                        {
                            "season_id": season_id,
                            "wars_saved": wars_saved,
                            "total_wars": len(all_war_tags),
                        }
                    )

                # Check more frequently during active CWL (every 6 hours)
                sleep_duration = 6 * 3600
            else:
                # No active CWL, check once per day
                logger.debug("No active CWL - checking again tomorrow")
                sleep_duration = 24 * 3600

            last_cwl_check = now
            await asyncio.sleep(sleep_duration)

        except Exception as e:
            logger.error(f"Error in CWL state check: {e}")
            # On error, retry after 1 hour
            await asyncio.sleep(3600)


async def start_event_monitor():
    """Start the event monitoring service."""
    global client, monitor_task, war_check_task, cwl_check_task

    if not settings.coc_email or not settings.coc_password:
        logger.warning("COC_EMAIL and COC_PASSWORD not configured - event monitoring disabled")
        return

    logger.info(f"Starting event monitoring service for {settings.clan_tag}")
    try:
        await client.login(settings.coc_email, settings.coc_password)
        logger.info("Successfully logged in to CoC API for event monitoring")

        # Add clan to track (for member join/leave/level events)
        client.add_clan_updates(settings.clan_tag)
        logger.info(f"Tracking clan events: {settings.clan_tag}")

        # Get current clan members and start tracking their donations
        try:
            clan = await client.get_clan(settings.clan_tag)
            logger.info(f"Setting up donation tracking for {len(clan.members)} clan members")

            # Add all current members to player tracking
            for member in clan.members:
                if member.tag not in tracked_player_tags:
                    tracked_player_tags.add(member.tag)
                    client.add_player_updates(member.tag)

            logger.info(f"Donation tracking active for {len(tracked_player_tags)} players")
        except Exception as e:
            logger.error(f"Error setting up player donation tracking: {e}")

        # Check if clan games are currently active (startup recovery)
        try:
            from datetime import datetime

            # Get clan games timing (these return timezone-naive UTC datetimes)
            games_start = coc.utils.get_clan_games_start()
            games_end = coc.utils.get_clan_games_end()
            now = datetime.utcnow()  # Use timezone-naive UTC to match

            logger.info(f"Checking clan games status - Start: {games_start}, End: {games_end}, Now: {now}")

            # Check if we're currently in clan games
            if games_start <= now <= games_end:
                logger.info("Clan games are currently active - checking session status")

                current_session = clan_games_storage.get_current_session()

                if not current_session or current_session.get("status") != "active":
                    # No active session - create one
                    logger.info("No active session found - creating new clan games session")
                    clan = await client.get_clan(settings.clan_tag)

                    initial_standings = {}
                    for member in clan.members:
                        try:
                            player = await client.get_player(member.tag)
                            games_achievement = player.get_achievement("Games Champion")
                            if games_achievement:
                                initial_standings[member.tag] = games_achievement.value
                        except Exception as e:
                            logger.error(f"Error getting Games Champion for {member.tag}: {e}")

                    session = clan_games_storage.start_session(initial_standings=initial_standings)
                    logger.info(f"Created recovery session: {session['session_id']} with {len(initial_standings)} players")

                    event_logger.log_event(
                        "CLAN_GAMES_START",
                        "🎮 Clan Games Session Recovered",
                        f"Container started during active clan games. Created session with {len(initial_standings)} members",
                        {
                            "session_id": session['session_id'],
                            "members_tracked": len(initial_standings),
                            "recovery": True,
                        }
                    )
                else:
                    # Session exists - sync with current members
                    logger.info(f"Found active session: {current_session['session_id']} - syncing with current members")
                    clan = await client.get_clan(settings.clan_tag)

                    synced_count = 0
                    for member in clan.members:
                        try:
                            player = await client.get_player(member.tag)
                            games_achievement = player.get_achievement("Games Champion")
                            if games_achievement:
                                clan_games_storage.update_player_points(
                                    player_tag=member.tag,
                                    player_name=member.name,
                                    new_total_points=games_achievement.value
                                )
                                synced_count += 1
                        except Exception as e:
                            logger.error(f"Error syncing {member.tag}: {e}")

                    logger.info(f"Synced {synced_count} players with active clan games session")
            else:
                # Clan games are not active - check if we have an orphaned session
                logger.info("Clan games are not currently active")

                current_session = clan_games_storage.get_current_session()
                if current_session and current_session.get("status") == "active":
                    logger.warning(f"Found orphaned active session {current_session['session_id']} - games have ended, finalizing session")

                    # Get clan size for participation rate
                    try:
                        clan = await client.get_clan(settings.clan_tag)
                        completed_session = clan_games_storage.end_session(clan_size=len(clan.members))

                        if completed_session:
                            total_points = completed_session['summary']['total_points']
                            participants = completed_session['summary']['participants']

                            logger.info(f"Auto-ended orphaned session: {participants} participants, {total_points:,} total points")

                            event_logger.log_event(
                                "CLAN_GAMES_END",
                                "🏆 Clan Games Completed (Auto-Recovery)",
                                f"Container started after games ended. Finalized session: {participants} members earned {total_points:,} points",
                                {
                                    "session_id": completed_session['session_id'],
                                    "total_points": total_points,
                                    "participants": participants,
                                    "participation_rate": completed_session['summary']['participation_rate'],
                                    "auto_recovery": True,
                                }
                            )
                    except Exception as e:
                        logger.error(f"Error auto-ending orphaned session: {e}")

        except Exception as e:
            logger.error(f"Error checking clan games status on startup: {e}")

        # Start war state checker
        war_check_task = asyncio.create_task(check_war_state())

        # Start league reset checker (all leagues, runs 5 mins before reset)
        legend_check_task = asyncio.create_task(check_league_reset())

        # Start CWL state checker
        cwl_check_task = asyncio.create_task(check_cwl_state())

        logger.info("Event monitoring active (member joins/leaves, donations, wars, level ups, clan games, season/CWL/leagues/capital)")

    except coc.InvalidCredentials as error:
        logger.error(f"Invalid CoC API credentials for event monitoring: {error}")
    except Exception as e:
        logger.error(f"Error starting event monitor: {e}")


async def stop_event_monitor():
    """Stop the event monitoring service."""
    global client, monitor_task, war_check_task, legend_check_task, cwl_check_task

    logger.info("Stopping event monitoring service")

    if war_check_task:
        war_check_task.cancel()

    if legend_check_task:
        legend_check_task.cancel()

    if cwl_check_task:
        cwl_check_task.cancel()

    if client:
        await client.close()
        logger.info("Event monitoring service stopped")
