"""
Clan Manager API - FastAPI backend service.

This service provides:
- CoC API proxy routes (live clan/player/war data)
- Analytics routes (predictions, statistics, war history)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Clan Manager API",
    description="Backend API for Clash of Clans clan management and analytics",
    version="1.0.0",
    docs_url=f"{settings.api_prefix}/docs",
    redoc_url=f"{settings.api_prefix}/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    logger.info("Starting Clan Manager API...")
    logger.info(f"CORS origins: {settings.cors_origins}")
    logger.info(f"Storage: {'S3' if settings.use_s3 else 'Local'}")

    # Start event monitoring in background
    from .services.event_monitor import start_event_monitor
    import asyncio
    asyncio.create_task(start_event_monitor())


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    logger.info("Shutting down Clan Manager API...")

    # Stop event monitoring
    from .services.event_monitor import stop_event_monitor
    await stop_event_monitor()


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Clan Manager API",
        "version": "1.0.0",
        "docs": f"{settings.api_prefix}/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "storage": "s3" if settings.use_s3 else "local"
    }


# Import and include routers
from .routers import coc, analytics, events, activity, clan_games

app.include_router(coc.router, prefix=f"{settings.api_prefix}/coc", tags=["CoC API"])
app.include_router(analytics.router, prefix=f"{settings.api_prefix}/analytics", tags=["Analytics"])
app.include_router(events.router, prefix=f"{settings.api_prefix}/events", tags=["Events"])
app.include_router(activity.router, prefix=f"{settings.api_prefix}/activity", tags=["Activity"])
app.include_router(clan_games.router, prefix=f"{settings.api_prefix}/clan-games", tags=["Clan Games"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=True
    )
