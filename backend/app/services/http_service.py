"""HTTP request service used by the HTTP tool."""

from __future__ import annotations

from typing import Any, Mapping

import httpx


_ALLOWED_HOST_PREFIXES = ("https://webhook.site",)


async def request(
    method: str, url: str, json: Mapping[str, Any] | None = None
) -> dict[str, Any]:
    """Perform a minimal HTTP request, primarily targeting webhook.site."""

    if not url.startswith(_ALLOWED_HOST_PREFIXES):
        return {
            "status": "invalid_url",
            "message": "URL not allowed by HTTP tool policy. Use webhook.site endpoints for HTTP requests.",
            "requested_url": url,
        }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.request(method=method.upper(), url=url, json=json)
    except httpx.HTTPError as exc:  # pragma: no cover - network failures
        return {
            "status": "network_error",
            "message": "HTTP request failed.",
            "details": str(exc),
        }

    return {
        "status": "ok",
        "status_code": response.status_code,
        "headers": dict(response.headers),
        "body": response.text,
    }
