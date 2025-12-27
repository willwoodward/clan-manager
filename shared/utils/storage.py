"""Storage abstraction layer with S3/local fallback."""

import json
import os
from abc import ABC, abstractmethod
from datetime import datetime
from pathlib import Path
from typing import Optional, List
import logging

logger = logging.getLogger(__name__)


class StorageBackend(ABC):
    """Abstract storage backend interface."""

    @abstractmethod
    async def save_war_data(self, war_data: dict, war_id: str) -> str:
        """Save war data and return the storage path/key."""
        pass

    @abstractmethod
    async def get_war_data(self, war_id: str) -> Optional[dict]:
        """Retrieve war data by ID."""
        pass

    @abstractmethod
    async def list_wars(self, limit: int = 100, prefix: Optional[str] = None) -> List[dict]:
        """List available wars."""
        pass

    @abstractmethod
    async def get_all_war_files(self) -> List[str]:
        """Get all war file paths/keys."""
        pass

    @abstractmethod
    async def save_cwl_season(self, season_data: dict, season_id: str) -> str:
        """Save CWL season data and return the storage path/key."""
        pass

    @abstractmethod
    async def get_cwl_season(self, season_id: str) -> Optional[dict]:
        """Retrieve CWL season data by ID."""
        pass

    @abstractmethod
    async def list_cwl_seasons(self, limit: int = 12) -> List[dict]:
        """List available CWL seasons."""
        pass

    @abstractmethod
    async def save_cwl_war(self, war_data: dict, war_tag: str) -> str:
        """Save CWL war data and return the storage path/key."""
        pass

    @abstractmethod
    async def get_cwl_war(self, war_tag: str) -> Optional[dict]:
        """Retrieve CWL war data by war tag."""
        pass

    @abstractmethod
    async def list_cwl_wars(self, season_id: Optional[str] = None, limit: int = 100) -> List[dict]:
        """List CWL wars, optionally filtered by season."""
        pass


class LocalStorageBackend(StorageBackend):
    """Local filesystem storage backend."""

    def __init__(self, data_dir: str = "data"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)

        # Create CWL subdirectories
        self.cwl_seasons_dir = self.data_dir / "cwl" / "seasons"
        self.cwl_wars_dir = self.data_dir / "cwl" / "wars"
        self.cwl_seasons_dir.mkdir(parents=True, exist_ok=True)
        self.cwl_wars_dir.mkdir(parents=True, exist_ok=True)

        logger.info(f"Initialized local storage at {self.data_dir.absolute()}")

    async def save_war_data(self, war_data: dict, war_id: str) -> str:
        """Save war data to local file."""
        filepath = self.data_dir / f"{war_id}.json"

        with open(filepath, "w") as f:
            json.dump(war_data, f, indent=2)

        logger.info(f"Saved war data to {filepath}")
        return str(filepath)

    async def get_war_data(self, war_id: str) -> Optional[dict]:
        """Retrieve war data from local file."""
        filepath = self.data_dir / f"{war_id}.json"

        if not filepath.exists():
            return None

        with open(filepath, "r") as f:
            return json.load(f)

    async def list_wars(self, limit: int = 100, prefix: Optional[str] = None) -> List[dict]:
        """List war files from local directory."""
        pattern = f"{prefix}*.json" if prefix else "war_*.json"
        files = list(self.data_dir.glob(pattern))

        wars = []
        for filepath in files:
            try:
                with open(filepath, "r") as f:
                    war_data = json.load(f)
                    wars.append({
                        "id": filepath.stem,
                        "data": war_data,
                        "path": str(filepath)
                    })
            except Exception as e:
                logger.error(f"Error reading {filepath}: {e}")

        # Sort by end_time from war data (most recent first)
        # Fall back to fetched_at or file modification time if end_time is not available
        def get_sort_key(war):
            data = war["data"]
            # Try end_time first
            if "end_time" in data and data["end_time"]:
                try:
                    return datetime.fromisoformat(data["end_time"].replace('Z', '+00:00'))
                except:
                    pass
            # Fall back to fetched_at
            if "fetched_at" in data and data["fetched_at"]:
                try:
                    return datetime.fromisoformat(data["fetched_at"].replace('Z', '+00:00'))
                except:
                    pass
            # Fall back to file modification time
            return datetime.fromtimestamp(Path(war["path"]).stat().st_mtime)

        wars.sort(key=get_sort_key, reverse=True)

        return wars[:limit]

    async def get_all_war_files(self) -> List[str]:
        """Get all war file paths."""
        return [str(p) for p in sorted(self.data_dir.glob("war_*.json"))]

    async def save_cwl_season(self, season_data: dict, season_id: str) -> str:
        """Save CWL season data to local file."""
        filepath = self.cwl_seasons_dir / f"{season_id}.json"

        with open(filepath, "w") as f:
            json.dump(season_data, f, indent=2)

        logger.info(f"Saved CWL season data to {filepath}")
        return str(filepath)

    async def get_cwl_season(self, season_id: str) -> Optional[dict]:
        """Retrieve CWL season data from local file."""
        filepath = self.cwl_seasons_dir / f"{season_id}.json"

        if not filepath.exists():
            return None

        with open(filepath, "r") as f:
            return json.load(f)

    async def list_cwl_seasons(self, limit: int = 12) -> List[dict]:
        """List CWL season files from local directory."""
        files = list(self.cwl_seasons_dir.glob("*.json"))

        seasons = []
        for filepath in files:
            try:
                with open(filepath, "r") as f:
                    season_data = json.load(f)
                    seasons.append({
                        "id": filepath.stem,
                        "data": season_data,
                        "path": str(filepath)
                    })
            except Exception as e:
                logger.error(f"Error reading {filepath}: {e}")

        # Sort by season_id (format: YYYY-MM) descending
        seasons.sort(key=lambda x: x["id"], reverse=True)

        return seasons[:limit]

    async def save_cwl_war(self, war_data: dict, war_tag: str) -> str:
        """Save CWL war data to local file."""
        # Remove # from war tag for filename
        safe_tag = war_tag.replace("#", "")
        filepath = self.cwl_wars_dir / f"{safe_tag}.json"

        with open(filepath, "w") as f:
            json.dump(war_data, f, indent=2)

        logger.info(f"Saved CWL war data to {filepath}")
        return str(filepath)

    async def get_cwl_war(self, war_tag: str) -> Optional[dict]:
        """Retrieve CWL war data from local file."""
        safe_tag = war_tag.replace("#", "")
        filepath = self.cwl_wars_dir / f"{safe_tag}.json"

        if not filepath.exists():
            return None

        with open(filepath, "r") as f:
            return json.load(f)

    async def list_cwl_wars(self, season_id: Optional[str] = None, limit: int = 100) -> List[dict]:
        """List CWL war files from local directory."""
        files = list(self.cwl_wars_dir.glob("*.json"))

        wars = []
        for filepath in files:
            try:
                with open(filepath, "r") as f:
                    war_data = json.load(f)

                    # Filter by season if specified
                    if season_id and war_data.get("season_id") != season_id:
                        continue

                    wars.append({
                        "id": filepath.stem,
                        "data": war_data,
                        "path": str(filepath)
                    })
            except Exception as e:
                logger.error(f"Error reading {filepath}: {e}")

        # Sort by start_time descending
        def get_sort_key(war):
            data = war["data"]
            if "start_time" in data and data["start_time"]:
                try:
                    return datetime.fromisoformat(data["start_time"].replace('Z', '+00:00'))
                except:
                    pass
            return datetime.fromtimestamp(0)

        wars.sort(key=get_sort_key, reverse=True)

        return wars[:limit]


class S3StorageBackend(StorageBackend):
    """S3 storage backend."""

    def __init__(self, bucket: str, prefix: str = "wars", region: str = "us-east-1"):
        self.bucket = bucket
        self.prefix = prefix
        self.region = region

        try:
            import boto3
            self.s3_client = boto3.client('s3', region_name=region)
            logger.info(f"Initialized S3 storage at s3://{bucket}/{prefix}")
        except ImportError:
            raise ImportError("boto3 is required for S3 storage. Install with: pip install boto3")
        except Exception as e:
            logger.error(f"Failed to initialize S3 client: {e}")
            raise

    def _get_s3_key(self, war_id: str, timestamp: Optional[datetime] = None) -> str:
        """Generate S3 key with date-based organization."""
        if timestamp is None:
            timestamp = datetime.now()

        # Organize by year/month/day for easy querying
        date_path = timestamp.strftime("%Y/%m/%d")
        return f"{self.prefix}/{date_path}/{war_id}.json"

    async def save_war_data(self, war_data: dict, war_id: str) -> str:
        """Save war data to S3."""
        # Parse timestamp from war data for proper organization
        timestamp = None
        if "fetched_at" in war_data:
            try:
                timestamp = datetime.fromisoformat(war_data["fetched_at"].replace('Z', '+00:00'))
            except:
                pass

        s3_key = self._get_s3_key(war_id, timestamp)

        try:
            self.s3_client.put_object(
                Bucket=self.bucket,
                Key=s3_key,
                Body=json.dumps(war_data, indent=2),
                ContentType='application/json'
            )
            logger.info(f"Saved war data to s3://{self.bucket}/{s3_key}")
            return f"s3://{self.bucket}/{s3_key}"
        except Exception as e:
            logger.error(f"Failed to save to S3: {e}")
            raise

    async def get_war_data(self, war_id: str) -> Optional[dict]:
        """Retrieve war data from S3."""
        # Need to search for the file since we don't know the date path
        try:
            # List all objects with this war_id
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket,
                Prefix=f"{self.prefix}/",
                MaxKeys=1000
            )

            for obj in response.get('Contents', []):
                if war_id in obj['Key']:
                    # Found it, retrieve the object
                    response = self.s3_client.get_object(
                        Bucket=self.bucket,
                        Key=obj['Key']
                    )
                    return json.loads(response['Body'].read())

            return None
        except Exception as e:
            logger.error(f"Failed to retrieve from S3: {e}")
            return None

    async def list_wars(self, limit: int = 100, prefix: Optional[str] = None) -> List[dict]:
        """List wars from S3."""
        try:
            search_prefix = f"{self.prefix}/{prefix}" if prefix else self.prefix

            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket,
                Prefix=search_prefix,
                MaxKeys=1000  # Fetch more to sort properly
            )

            wars = []
            for obj in response.get('Contents', []):
                try:
                    # Retrieve the war data
                    data_response = self.s3_client.get_object(
                        Bucket=self.bucket,
                        Key=obj['Key']
                    )
                    war_data = json.loads(data_response['Body'].read())

                    wars.append({
                        "id": Path(obj['Key']).stem,
                        "data": war_data,
                        "path": f"s3://{self.bucket}/{obj['Key']}"
                    })
                except Exception as e:
                    logger.error(f"Error reading S3 object {obj['Key']}: {e}")

            # Sort by end_time from war data (most recent first)
            # Fall back to fetched_at or S3 LastModified if end_time is not available
            def get_sort_key(war):
                data = war["data"]
                # Try end_time first
                if "end_time" in data and data["end_time"]:
                    try:
                        return datetime.fromisoformat(data["end_time"].replace('Z', '+00:00'))
                    except:
                        pass
                # Fall back to fetched_at
                if "fetched_at" in data and data["fetched_at"]:
                    try:
                        return datetime.fromisoformat(data["fetched_at"].replace('Z', '+00:00'))
                    except:
                        pass
                # Fall back to epoch (will be sorted last)
                return datetime.fromtimestamp(0)

            wars.sort(key=get_sort_key, reverse=True)

            return wars[:limit]
        except Exception as e:
            logger.error(f"Failed to list wars from S3: {e}")
            return []

    async def get_all_war_files(self) -> List[str]:
        """Get all war file S3 keys."""
        try:
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket,
                Prefix=self.prefix
            )

            return [f"s3://{self.bucket}/{obj['Key']}"
                   for obj in response.get('Contents', [])
                   if obj['Key'].endswith('.json')]
        except Exception as e:
            logger.error(f"Failed to list S3 objects: {e}")
            return []

    async def save_cwl_season(self, season_data: dict, season_id: str) -> str:
        """Save CWL season data to S3."""
        s3_key = f"{self.prefix}/cwl/seasons/{season_id}.json"

        try:
            self.s3_client.put_object(
                Bucket=self.bucket,
                Key=s3_key,
                Body=json.dumps(season_data, indent=2),
                ContentType='application/json'
            )
            logger.info(f"Saved CWL season data to s3://{self.bucket}/{s3_key}")
            return f"s3://{self.bucket}/{s3_key}"
        except Exception as e:
            logger.error(f"Failed to save CWL season to S3: {e}")
            raise

    async def get_cwl_season(self, season_id: str) -> Optional[dict]:
        """Retrieve CWL season data from S3."""
        s3_key = f"{self.prefix}/cwl/seasons/{season_id}.json"

        try:
            response = self.s3_client.get_object(
                Bucket=self.bucket,
                Key=s3_key
            )
            return json.loads(response['Body'].read())
        except self.s3_client.exceptions.NoSuchKey:
            return None
        except Exception as e:
            logger.error(f"Failed to retrieve CWL season from S3: {e}")
            return None

    async def list_cwl_seasons(self, limit: int = 12) -> List[dict]:
        """List CWL seasons from S3."""
        try:
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket,
                Prefix=f"{self.prefix}/cwl/seasons/",
                MaxKeys=100
            )

            seasons = []
            for obj in response.get('Contents', []):
                try:
                    data_response = self.s3_client.get_object(
                        Bucket=self.bucket,
                        Key=obj['Key']
                    )
                    season_data = json.loads(data_response['Body'].read())

                    seasons.append({
                        "id": Path(obj['Key']).stem,
                        "data": season_data,
                        "path": f"s3://{self.bucket}/{obj['Key']}"
                    })
                except Exception as e:
                    logger.error(f"Error reading S3 object {obj['Key']}: {e}")

            # Sort by season_id descending
            seasons.sort(key=lambda x: x["id"], reverse=True)

            return seasons[:limit]
        except Exception as e:
            logger.error(f"Failed to list CWL seasons from S3: {e}")
            return []

    async def save_cwl_war(self, war_data: dict, war_tag: str) -> str:
        """Save CWL war data to S3."""
        safe_tag = war_tag.replace("#", "")
        s3_key = f"{self.prefix}/cwl/wars/{safe_tag}.json"

        try:
            self.s3_client.put_object(
                Bucket=self.bucket,
                Key=s3_key,
                Body=json.dumps(war_data, indent=2),
                ContentType='application/json'
            )
            logger.info(f"Saved CWL war data to s3://{self.bucket}/{s3_key}")
            return f"s3://{self.bucket}/{s3_key}"
        except Exception as e:
            logger.error(f"Failed to save CWL war to S3: {e}")
            raise

    async def get_cwl_war(self, war_tag: str) -> Optional[dict]:
        """Retrieve CWL war data from S3."""
        safe_tag = war_tag.replace("#", "")
        s3_key = f"{self.prefix}/cwl/wars/{safe_tag}.json"

        try:
            response = self.s3_client.get_object(
                Bucket=self.bucket,
                Key=s3_key
            )
            return json.loads(response['Body'].read())
        except self.s3_client.exceptions.NoSuchKey:
            return None
        except Exception as e:
            logger.error(f"Failed to retrieve CWL war from S3: {e}")
            return None

    async def list_cwl_wars(self, season_id: Optional[str] = None, limit: int = 100) -> List[dict]:
        """List CWL wars from S3."""
        try:
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket,
                Prefix=f"{self.prefix}/cwl/wars/",
                MaxKeys=200
            )

            wars = []
            for obj in response.get('Contents', []):
                try:
                    data_response = self.s3_client.get_object(
                        Bucket=self.bucket,
                        Key=obj['Key']
                    )
                    war_data = json.loads(data_response['Body'].read())

                    # Filter by season if specified
                    if season_id and war_data.get("season_id") != season_id:
                        continue

                    wars.append({
                        "id": Path(obj['Key']).stem,
                        "data": war_data,
                        "path": f"s3://{self.bucket}/{obj['Key']}"
                    })
                except Exception as e:
                    logger.error(f"Error reading S3 object {obj['Key']}: {e}")

            # Sort by start_time descending
            def get_sort_key(war):
                data = war["data"]
                if "start_time" in data and data["start_time"]:
                    try:
                        return datetime.fromisoformat(data["start_time"].replace('Z', '+00:00'))
                    except:
                        pass
                return datetime.fromtimestamp(0)

            wars.sort(key=get_sort_key, reverse=True)

            return wars[:limit]
        except Exception as e:
            logger.error(f"Failed to list CWL wars from S3: {e}")
            return []


class StorageManager:
    """Storage manager with automatic S3/local fallback."""

    def __init__(
        self,
        use_s3: bool = True,
        s3_bucket: Optional[str] = None,
        s3_prefix: str = "wars",
        s3_region: str = "us-east-1",
        local_data_dir: str = "data"
    ):
        self.backends: List[StorageBackend] = []

        # Try S3 first if enabled
        if use_s3 and s3_bucket:
            try:
                s3_backend = S3StorageBackend(
                    bucket=s3_bucket,
                    prefix=s3_prefix,
                    region=s3_region
                )
                self.backends.append(s3_backend)
                logger.info("S3 storage backend enabled")
            except Exception as e:
                logger.warning(f"S3 storage unavailable, falling back to local: {e}")

        # Always add local storage as fallback
        local_backend = LocalStorageBackend(data_dir=local_data_dir)
        self.backends.append(local_backend)
        logger.info("Local storage backend enabled")

        if not self.backends:
            raise RuntimeError("No storage backends available")

    @property
    def primary_backend(self) -> StorageBackend:
        """Get the primary (first available) storage backend."""
        return self.backends[0]

    async def save_war_data(self, war_data: dict, war_id: str) -> str:
        """Save war data using primary backend."""
        return await self.primary_backend.save_war_data(war_data, war_id)

    async def get_war_data(self, war_id: str) -> Optional[dict]:
        """Try to retrieve war data from any available backend."""
        for backend in self.backends:
            try:
                data = await backend.get_war_data(war_id)
                if data:
                    return data
            except Exception as e:
                logger.error(f"Error retrieving from {backend.__class__.__name__}: {e}")

        return None

    async def list_wars(self, limit: int = 100, prefix: Optional[str] = None) -> List[dict]:
        """List wars from primary backend."""
        return await self.primary_backend.list_wars(limit=limit, prefix=prefix)

    async def get_all_war_files(self) -> List[str]:
        """Get all war files from primary backend."""
        return await self.primary_backend.get_all_war_files()

    async def save_cwl_season(self, season_data: dict, season_id: str) -> str:
        """Save CWL season data using primary backend."""
        return await self.primary_backend.save_cwl_season(season_data, season_id)

    async def get_cwl_season(self, season_id: str) -> Optional[dict]:
        """Try to retrieve CWL season data from any available backend."""
        for backend in self.backends:
            try:
                data = await backend.get_cwl_season(season_id)
                if data:
                    return data
            except Exception as e:
                logger.error(f"Error retrieving CWL season from {backend.__class__.__name__}: {e}")

        return None

    async def list_cwl_seasons(self, limit: int = 12) -> List[dict]:
        """List CWL seasons from primary backend."""
        return await self.primary_backend.list_cwl_seasons(limit=limit)

    async def save_cwl_war(self, war_data: dict, war_tag: str) -> str:
        """Save CWL war data using primary backend."""
        return await self.primary_backend.save_cwl_war(war_data, war_tag)

    async def get_cwl_war(self, war_tag: str) -> Optional[dict]:
        """Try to retrieve CWL war data from any available backend."""
        for backend in self.backends:
            try:
                data = await backend.get_cwl_war(war_tag)
                if data:
                    return data
            except Exception as e:
                logger.error(f"Error retrieving CWL war from {backend.__class__.__name__}: {e}")

        return None

    async def list_cwl_wars(self, season_id: Optional[str] = None, limit: int = 100) -> List[dict]:
        """List CWL wars from primary backend."""
        return await self.primary_backend.list_cwl_wars(season_id=season_id, limit=limit)

    def get_backend_info(self) -> dict:
        """Get information about active storage backends."""
        return {
            "backends": [
                {
                    "type": backend.__class__.__name__,
                    "primary": i == 0
                }
                for i, backend in enumerate(self.backends)
            ]
        }
