"""Sentence-transformers embedding helper."""

from __future__ import annotations

import asyncio
from functools import lru_cache
from typing import Iterable, Sequence

from sentence_transformers import SentenceTransformer

from ..config import get_settings


class EmbeddingProvider:
    """Thin wrapper around a sentence-transformers model."""

    def __init__(self, model_name: str) -> None:
        self._model_name = model_name

    @property
    def model(self) -> SentenceTransformer:
        return _get_model(self._model_name)

    async def embed_texts(self, texts: Sequence[str]) -> list[list[float]]:
        """Embed a batch of texts async-friendly."""

        return await asyncio.to_thread(
            lambda: self.model.encode(list(texts), normalize_embeddings=True).tolist()
        )


@lru_cache(maxsize=2)
def _get_model(model_name: str) -> SentenceTransformer:
    return SentenceTransformer(model_name)


@lru_cache(maxsize=1)
def get_embedding_provider() -> EmbeddingProvider:
    settings = get_settings()
    return EmbeddingProvider(settings.embedding_model_name)
