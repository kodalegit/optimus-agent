"""Versioned API routers."""

from fastapi import APIRouter

from . import agent, health, rag

router = APIRouter()
router.include_router(health.router, prefix="/health", tags=["health"])
router.include_router(agent.router)
router.include_router(rag.router)

__all__ = ["router"]
