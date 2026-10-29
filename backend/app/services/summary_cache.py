"""In-process cache for the dashboard summary.

The summary only changes when data is written, so it is cached per filter set and
cleared after any session commit. The key includes today's (UTC) date because the
current salary depends on SQL `current_date`. A generation counter stops a result
computed before a commit from being stored after it.
"""

from collections.abc import Callable
from dataclasses import astuple
from datetime import UTC, datetime
from threading import Lock

from sqlalchemy import event
from sqlalchemy.orm import Session

from app.schemas.analytics import AnalyticsSummary
from app.services.filters import EmployeeFilters

_MAX_ENTRIES = 256

_lock = Lock()
_entries: dict[tuple, AnalyticsSummary] = {}
_generation = 0


def _key(filters: EmployeeFilters) -> tuple:
    fields = tuple(tuple(value) if isinstance(value, list) else value for value in astuple(filters))
    return (datetime.now(UTC).date(), fields)


def get_or_compute(filters: EmployeeFilters, compute: Callable[[], AnalyticsSummary]) -> AnalyticsSummary:
    key = _key(filters)
    with _lock:
        if (cached := _entries.get(key)) is not None:
            return cached
        generation = _generation
    result = compute()
    with _lock:
        if generation == _generation:
            if len(_entries) >= _MAX_ENTRIES:
                _entries.clear()
            _entries[key] = result
    return result


def clear() -> None:
    global _generation
    with _lock:
        _generation += 1
        _entries.clear()


@event.listens_for(Session, "after_commit")
def _clear_after_commit(_session: Session) -> None:
    clear()
