"""Application settings and configuration helpers."""

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Core runtime configuration loaded from environment variables."""

    app_name: str = "Optimus Agent Backend"
    api_v1_prefix: str = "/api/v1"
    cors_origins: List[str] = ["*"]

    database_url: str = "postgresql+asyncpg://optimus:optimus@db:5432/optimus"

    embedding_model_name: str = "sentence-transformers/all-MiniLM-L6-v2"
    rag_chunk_size: int = 500
    rag_chunk_overlap: int = 50

    openai_api_key: str | None = None
    google_api_key: str | None = None

    langfuse_host: str = "http://langfuse:3000"
    langfuse_public_key: str | None = None
    langfuse_secret_key: str | None = None

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return a cached Settings instance."""

    return Settings()
