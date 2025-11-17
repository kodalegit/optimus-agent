"""FastAPI dependency providers."""

from collections.abc import AsyncIterator

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from .core.db import get_async_session


async def get_db_session() -> AsyncIterator[AsyncSession]:
    """Yield an async SQLAlchemy session.

    This wraps the core get_async_session async generator so that FastAPI
    receives a proper async dependency rather than an async_generator
    object.
    """

    async for session in get_async_session():
        yield session


async def db_session_dependency(
    session: AsyncSession = Depends(get_db_session),
) -> AsyncIterator[AsyncSession]:
    """Expose the DB session as a dependency for request handlers."""

    yield session
