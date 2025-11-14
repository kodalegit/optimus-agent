"""Mock search service used by the search tool."""

from __future__ import annotations

from typing import Any, List


async def search(query: str) -> List[dict[str, Any]]:
    """Return mock search results for the given query.

    This keeps logic simple and deterministic for the technical test while
    exercising the agent's ability to call a search tool.
    """

    base_url = "https://example.com"
    return [
        {
            "title": f"Result {i} for {query}",
            "snippet": f"This is a mock search snippet {i} about '{query}'.",
            "url": f"{base_url}/{i}",
        }
        for i in range(1, 4)
    ]
