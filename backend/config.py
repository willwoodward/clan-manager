"""Configuration for FastAPI backend."""

from pydantic import ConfigDict
from pydantic_settings import BaseSettings
from typing import Optional


class APISettings(BaseSettings):
    model_config = ConfigDict(extra='ignore', env_file='.env', env_file_encoding='utf-8')

    """API server configuration."""

    # CoC API - Using coc.py with email/password authentication
    coc_email: str
    coc_password: str
    clan_tag: str = "#29U8UJCU0"

    # Storage
    use_s3: bool = False
    s3_bucket: Optional[str] = None
    s3_prefix: str = "wars"
    s3_region: str = "us-east-1"
    local_data_dir: str = "../data-server/data"  # Fallback to data-server data

    # Cache
    redis_url: Optional[str] = None
    cache_ttl: int = 3600  # 1 hour

    # API
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    api_prefix: str = "/api"

    # Server
    host: str = "0.0.0.0"
    port: int = 8000


# Global settings instance
settings = APISettings()
