"""Database configuration helpers."""

from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from ..config import get_settings


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""


_settings = get_settings()
_engine = create_async_engine(_settings.database_url, echo=False)
_session_factory = async_sessionmaker(
    _engine,
    expire_on_commit=False,
)


async def get_async_session() -> AsyncIterator[AsyncSession]:
    """Yield an async SQLAlchemy session bound to the primary engine."""

    async with _session_factory() as session:
        yield session


async def init_db() -> None:
    """Initialise database schema and vector extension if needed."""

    from . import models  # ensure models are imported for metadata

    async with _engine.begin() as conn:
        await conn.execute("CREATE EXTENSION IF NOT EXISTS vector")
        await conn.run_sync(models.Base.metadata.create_all)
        await conn.execute(
            """
            CREATE INDEX IF NOT EXISTS ix_document_chunks_embedding_hnsw
            ON document_chunks
            USING hnsw (embedding vector_l2_ops)
            """
        )


__all__ = ["Base", "get_async_session", "_engine", "init_db"]
