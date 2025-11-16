"""Embedding helper using remote OpenAI embeddings."""

from __future__ import annotations

import asyncio
from functools import lru_cache
from typing import Sequence

from langchain_openai import OpenAIEmbeddings

from ..config import get_settings


class EmbeddingProvider:
    """Thin wrapper around an OpenAI embedding model."""

    def __init__(self, model_name: str, api_key: str | None) -> None:
        if not api_key:
            raise RuntimeError("Missing OpenAI API key for embeddings")
        self._embedder = OpenAIEmbeddings(model=model_name, api_key=api_key)

    async def embed_texts(self, texts: Sequence[str]) -> list[list[float]]:
        """Embed a batch of texts async-friendly using OpenAI embeddings."""

        texts_list = list(texts)
        return await asyncio.to_thread(self._embedder.embed_documents, texts_list)


@lru_cache(maxsize=1)
def get_embedding_provider() -> EmbeddingProvider:
    settings = get_settings()
    return EmbeddingProvider(settings.embedding_model_name, settings.openai_api_key)
