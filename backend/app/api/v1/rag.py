"""RAG management endpoints (upload + search)."""

from fastapi import APIRouter, Depends, File, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from ...deps import db_session_dependency
from ...services import rag_service


router = APIRouter(prefix="/rag", tags=["rag"])


class RagSearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    top_k: int = Field(default=5, ge=1, le=20)


@router.post("/documents", summary="Upload and index a document")
async def upload_document(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(db_session_dependency),
) -> dict[str, str | int]:
    """Upload a document (PDF or text) and index it for retrieval."""

    document_id = await rag_service.index_document(session, file)
    return {"status": "indexed", "document_id": document_id}


@router.post("/search", summary="Search indexed documents")
async def search_documents(
    payload: RagSearchRequest,
    session: AsyncSession = Depends(db_session_dependency),
) -> dict[str, list[dict[str, str]]]:
    """Search the RAG store for relevant chunks."""

    results = await rag_service.query(session, payload.query, payload.top_k)
    return {"results": results}
