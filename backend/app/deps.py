"""FastAPI dependency providers."""

from collections.abc import AsyncIterator

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from .core.db import get_async_session


def get_db_session() -> AsyncIterator[AsyncSession]:
    """Yield an async SQLAlchemy session."""

    return get_async_session()


async def db_session_dependency(
    session: AsyncSession = Depends(get_db_session),
) -> AsyncIterator[AsyncSession]:
    """Expose the DB session as a dependency for request handlers."""

    yield session
