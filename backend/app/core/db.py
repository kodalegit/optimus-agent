"""Database configuration helpers."""

from collections.abc import AsyncIterator

from sqlalchemy import text
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
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.run_sync(models.Base.metadata.create_all)
        await conn.execute(
            text(
                """
                CREATE INDEX IF NOT EXISTS ix_document_chunks_embedding_hnsw
                ON document_chunks
                USING hnsw (embedding vector_l2_ops)
                """
            )
        )

        # Seed a minimal demo dataset for the OpsAgent scenario so the SQL tool
        # has something concrete to query. These inserts are idempotent.
        await conn.execute(
            text(
                """
                INSERT INTO customers (customer_id, name, email)
                VALUES (42, 'Maria Rodriguez', 'maria.rodriguez@example.com')
                ON CONFLICT (customer_id) DO NOTHING
                """
            )
        )

        await conn.execute(
            text(
                """
                INSERT INTO orders (order_id, customer_id, order_date, status_tracking_id)
                VALUES (98765, 42, NOW(), 'SHP12345')
                ON CONFLICT (order_id) DO NOTHING
                """
            )
        )

    # Seed a small company policy document into the RAG store if not present,
    # so rag_lookup has a concrete policy to reference in demos.
    from ..services import rag_service

    policy_filename = "company_policies_seed.txt"
    policy_text = """Company return policy - electronics

- Electronics returns are subject to a 15% restocking fee if the box has been opened.
- Returns must be initiated within 30 days of delivery.
- Items must include all accessories and original packaging.
"""

    async with _session_factory() as session:
        result = await session.execute(
            text("SELECT id FROM documents WHERE filename = :filename LIMIT 1"),
            {"filename": policy_filename},
        )
        if result.scalar() is None:
            await rag_service.index_text(
                session,
                text_content=policy_text,
                filename=policy_filename,
                content_type="text/plain",
            )


__all__ = ["Base", "get_async_session", "_engine", "init_db"]
