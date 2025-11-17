"""LangChain tool registry for the Optimus Agent backend."""

from functools import lru_cache
from typing import Any, Sequence

from langchain.tools import BaseTool, tool

from . import (
    calculator_service,
    email_service,
    http_service,
    rag_service,
    search_service,
    sql_service,
)


@tool("search", return_direct=False)
async def search_tool(query: str) -> list[dict[str, Any]]:
    """Search internal and external information sources for a query."""

    return await search_service.search(query)


@tool("calculator")
def calculator_tool(expression: str) -> float:
    """Safely evaluate a basic arithmetic expression."""

    return calculator_service.evaluate(expression)


@tool("rag_lookup")
async def rag_lookup_tool(query: str, top_k: int = 5) -> list[dict[str, Any]]:
    """Look up relevant document chunks using the retrieval pipeline."""

    # The RAG service expects a DB session; here we use a short-lived one.
    from sqlalchemy.ext.asyncio import AsyncSession

    from ..core.db import get_async_session

    async for session in get_async_session():  # type: ignore[assignment]
        assert isinstance(session, AsyncSession)
        return await rag_service.query(session, query, top_k=top_k)

    return []


@tool("send_mail")
async def send_mail_tool(to: str, subject: str, body: str) -> dict[str, Any]:
    """Send an email and return a confirmation payload."""

    return await email_service.send(to=to, subject=subject, body=body)


@tool("http_request")
async def http_request_tool(
    method: str, url: str, body: dict | None = None
) -> dict[str, Any]:
    """Perform an HTTP request to an allowed URL and return the response payload."""

    return await http_service.request(method=method, url=url, json=body or None)


@tool("sql_fetch")
async def sql_fetch_tool(query: str) -> list[dict[str, Any]]:
    """Execute a read-only SQL query and return rows as dictionaries."""

    return await sql_service.fetch(query)


@lru_cache(maxsize=1)
def get_tools() -> Sequence[BaseTool]:
    """Return the list of available LangChain tools for the agent."""

    return (
        search_tool,
        calculator_tool,
        rag_lookup_tool,
        send_mail_tool,
        http_request_tool,
        sql_fetch_tool,
    )
