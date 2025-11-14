"""SQL fetch service for read-only queries."""

from __future__ import annotations

from typing import Any, Iterable, List

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from ..core.db import _engine


_session_factory: async_sessionmaker[AsyncSession] = async_sessionmaker(
    _engine, expire_on_commit=False
)


async def fetch(query: str) -> List[dict[str, Any]]:
    """Execute a read-only SQL query and return rows as dictionaries.

    For safety, only SELECT statements are allowed.
    """

    stripped = query.strip().lower()
    if not stripped.startswith("select"):
        raise ValueError("Only SELECT statements are allowed in sql_fetch tool")

    async with _session_factory() as session:
        result = await session.execute(text(query))
        rows = result.fetchall()

    return [dict(row._mapping) for row in rows]
