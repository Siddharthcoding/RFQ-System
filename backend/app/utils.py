"""
Shared utilities used across the application.
Pure functions - no DB, no HTTP concerns.
"""
from datetime import datetime, timezone, timedelta
from typing import Optional


def now_utc() -> datetime:
    """Current UTC time as a naive datetime (no tzinfo) for consistent DB storage."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def to_naive_utc(dt: Optional[datetime]) -> Optional[datetime]:
    """Strips timezone info from a datetime, converting to UTC first if needed."""
    if dt is None:
        return None
    if dt.tzinfo is not None:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt
