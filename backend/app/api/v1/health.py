"""Health check endpoints."""

from fastapi import APIRouter

router = APIRouter()


@router.get("", summary="Health check")
async def health_check() -> dict[str, str]:
    """Simple health endpoint used by Docker and monitoring."""

    return {"status": "ok"}
