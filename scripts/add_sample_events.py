"""Add sample events for testing the event log."""

import sys
from pathlib import Path
from datetime import datetime, timedelta
import json

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Import event logger directly to avoid dependency issues
import importlib.util
spec = importlib.util.spec_from_file_location(
    "event_logger",
    Path(__file__).parent.parent / "shared" / "utils" / "event_logger.py"
)
event_logger_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(event_logger_module)

EventLogger = event_logger_module.EventLogger
EventType = event_logger_module.EventType

def main():
    # Initialize event logger
    logger = EventLogger(data_dir="data/events")

    # Sample events from the past week
    events = [
        {
            "type": EventType.MEMBER_JOIN,
            "title": "New Member Joined",
            "description": "WizardKing joined the clan",
            "days_ago": 0.5,
        },
        {
            "type": EventType.WAR_WON,
            "title": "War Victory!",
            "description": "Defeated The Warriors with 45 stars to 38",
            "days_ago": 1,
        },
        {
            "type": EventType.DONATION_MILESTONE,
            "title": "Donation Milestone",
            "description": "DragonSlayer reached 5,000 donations this season",
            "days_ago": 2,
        },
        {
            "type": EventType.PROMOTION,
            "title": "Member Promoted",
            "description": "Phoenix was promoted to Elder",
            "days_ago": 3,
        },
        {
            "type": EventType.WAR_START,
            "title": "War Started",
            "description": "War against Clash Masters is now in preparation",
            "days_ago": 3.5,
        },
        {
            "type": EventType.MEMBER_LEAVE,
            "title": "Member Left",
            "description": "InactivePLayer left the clan",
            "days_ago": 4,
        },
        {
            "type": EventType.WAR_WON,
            "title": "Perfect War!",
            "description": "Defeated Elite Squad with a perfect war - 50 stars to 43",
            "days_ago": 5,
        },
        {
            "type": EventType.MEMBER_JOIN,
            "title": "New Member Joined",
            "description": "ThunderBolt joined the clan",
            "days_ago": 6,
        },
        {
            "type": EventType.DONATION_MILESTONE,
            "title": "Donation Milestone",
            "description": "NightRider reached 3,000 donations this season",
            "days_ago": 7,
        },
        {
            "type": EventType.CLAN_LEVEL_UP,
            "title": "Clan Level Up!",
            "description": "Clan reached level 15",
            "days_ago": 8,
        },
        {
            "type": EventType.WAR_START,
            "title": "War Started",
            "description": "War against Alpha Clan is now in preparation",
            "days_ago": 8.5,
        },
        {
            "type": EventType.MEMBER_JOIN,
            "title": "New Member Joined",
            "description": "FrostMage joined the clan",
            "days_ago": 9,
        },
        {
            "type": EventType.WAR_WON,
            "title": "War Victory!",
            "description": "Defeated Beta Warriors with 48 stars to 42",
            "days_ago": 10,
        },
        {
            "type": EventType.PROMOTION,
            "title": "Member Promoted",
            "description": "StormBreaker was promoted to Co-Leader",
            "days_ago": 11,
        },
    ]

    print("Adding sample events...")
    for event in events:
        # Calculate timestamp
        timestamp = datetime.now() - timedelta(days=event["days_ago"])

        # Log the event with custom timestamp
        event_data = {
            "id": f"{event['type']}_{int(timestamp.timestamp())}",
            "type": event['type'],
            "title": event['title'],
            "description": event['description'],
            "timestamp": timestamp.isoformat(),
            "metadata": {}
        }

        # Manually append event
        events_list = logger._load_events()
        events_list.append(event_data)
        logger._save_events(events_list)

        print(f"✓ Added: {event['title']}")

    print(f"\n✅ Successfully added {len(events)} sample events!")
    print(f"Events file: {logger.events_file}")


if __name__ == "__main__":
    main()
