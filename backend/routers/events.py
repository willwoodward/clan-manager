"""Events API routes - clan activity tracking."""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from shared.utils.event_logger import EventLogger
from ..config import settings
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

# Initialize event logger - use absolute path to project root
project_root = Path(__file__).parent.parent.parent
event_logger = EventLogger(
    data_dir=str(project_root / "data" / "events")
)


@router.get("/recent")
async def get_recent_events(
    limit: int = Query(50, ge=1, le=100),
    event_type: Optional[str] = None
):
    """
    Get recent clan events.

    Args:
        limit: Maximum number of events to return (1-100)
        event_type: Filter by event type (optional)

    Returns:
        List of recent events
    """
    try:
        events = event_logger.get_events(limit=limit, event_type=event_type)
        return {
            "events": events,
            "count": len(events)
        }
    except Exception as e:
        logger.error(f"Error fetching events: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/log")
async def log_event(
    event_type: str,
    title: str,
    description: str,
    metadata: dict = None
):
    """
    Log a new event (for internal use/testing).

    Args:
        event_type: Type of event
        title: Event title
        description: Event description
        metadata: Additional event data
    """
    try:
        event_logger.log_event(
            event_type=event_type,
            title=title,
            description=description,
            metadata=metadata
        )
        return {"success": True, "message": "Event logged successfully"}
    except Exception as e:
        logger.error(f"Error logging event: {e}")
        raise HTTPException(status_code=500, detail=str(e))
