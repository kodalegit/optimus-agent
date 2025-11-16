"""RAG ingestion and query service built on pgvector and sentence-transformers."""

from __future__ import annotations

from typing import Any, List

import fitz  # PyMuPDF
from fastapi import UploadFile
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sqlalchemy import Integer, bindparam, text
from pgvector.sqlalchemy import Vector
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..core import models
from .embeddings import get_embedding_provider


async def index_document(session: AsyncSession, file: UploadFile) -> int:
    """Ingest a single uploaded document (text or PDF) into the RAG store."""

    settings = get_settings()
    raw_bytes = await file.read()

    # Basic content-type dispatch; default to UTF-8 text.
    content_type = (file.content_type or "text/plain").lower()
    if content_type in {
        "application/pdf",
        "application/x-pdf",
    } or file.filename.lower().endswith(".pdf"):
        text_content = _extract_text_from_pdf(raw_bytes)
    else:
        text_content = raw_bytes.decode("utf-8", errors="ignore")

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.rag_chunk_size,
        chunk_overlap=settings.rag_chunk_overlap,
    )
    chunks = splitter.split_text(text_content)

    if not chunks:
        raise ValueError("Uploaded document contained no extractable text")

    provider = get_embedding_provider()
    embeddings = await provider.embed_texts(chunks)

    document = models.Document(
        filename=file.filename,
        content_type=content_type,
        metadata_={},
    )
    session.add(document)
    await session.flush()

    for idx, (chunk_text, embedding) in enumerate(zip(chunks, embeddings)):
        chunk = models.DocumentChunk(
            document_id=document.id,
            chunk_index=idx,
            content=chunk_text,
            metadata_={},
            embedding=embedding,
        )
        session.add(chunk)

    await session.commit()
    return document.id


async def index_text(
    session: AsyncSession,
    text_content: str,
    filename: str,
    content_type: str = "text/plain",
) -> int:
    """Ingest a raw text document into the RAG store."""

    settings = get_settings()

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.rag_chunk_size,
        chunk_overlap=settings.rag_chunk_overlap,
    )
    chunks = splitter.split_text(text_content)

    if not chunks:
        raise ValueError("Provided text contained no extractable text")

    provider = get_embedding_provider()
    embeddings = await provider.embed_texts(chunks)

    document = models.Document(
        filename=filename,
        content_type=content_type,
        metadata_={},
    )
    session.add(document)
    await session.flush()

    for idx, (chunk_text, embedding) in enumerate(zip(chunks, embeddings)):
        chunk = models.DocumentChunk(
            document_id=document.id,
            chunk_index=idx,
            content=chunk_text,
            metadata_={},
            embedding=embedding,
        )
        session.add(chunk)

    await session.commit()
    return document.id


def _extract_text_from_pdf(raw_bytes: bytes) -> str:
    """Extract concatenated text from a PDF file using PyMuPDF."""

    doc = fitz.open(stream=raw_bytes, filetype="pdf")
    try:
        parts: list[str] = []
        for page in doc:
            parts.append(page.get_text("text"))
        return "\n".join(parts)
    finally:
        doc.close()


async def query(
    session: AsyncSession, query_text: str, top_k: int = 5
) -> List[dict[str, Any]]:
    """Return the top-k most similar chunks for the given query text."""

    provider = get_embedding_provider()
    [query_embedding] = await provider.embed_texts([query_text])

    sql = (
        text(
            """
            SELECT id, document_id, content, metadata,
                   1 - (embedding <-> :embedding) AS score
            FROM document_chunks
            ORDER BY embedding <-> :embedding
            LIMIT :top_k
            """
        )
        .bindparams(bindparam("embedding", type_=Vector(1536)))
        .bindparams(bindparam("top_k", type_=Integer))
    )

    result = await session.execute(
        sql,
        {"embedding": query_embedding, "top_k": top_k},
    )

    rows = result.fetchall()
    return [dict(row._mapping) for row in rows]
