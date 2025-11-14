"""Agent-related endpoints (query + streaming)."""

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from ...services.agent_service import (
    run_agent_query as execute_agent_query,
    stream_agent_events,
)

router = APIRouter(prefix="/agent", tags=["agent"])


class AgentQueryRequest(BaseModel):
    query: str = Field(..., min_length=1)
    model_provider: str = Field(default="openai")
    model_name: str = Field(default="gpt-4o-mini")


class AgentQueryResponse(BaseModel):
    message: str


@router.post("/query", response_model=AgentQueryResponse)
async def run_agent_query(payload: AgentQueryRequest) -> AgentQueryResponse:
    """Placeholder sync-style agent endpoint."""

    message = await execute_agent_query(
        query=payload.query,
        provider=payload.model_provider,
        model_name=payload.model_name,
    )
    return AgentQueryResponse(message=message)


@router.post("/stream")
async def stream_agent_response(payload: AgentQueryRequest) -> StreamingResponse:
    """Placeholder streaming endpoint until the agent service is wired."""

    event_stream = stream_agent_events(
        query=payload.query,
        provider=payload.model_provider,
        model_name=payload.model_name,
    )
    return StreamingResponse(event_stream, media_type="text/event-stream")
