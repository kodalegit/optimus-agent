"""HTTP request service used by the HTTP tool."""

from __future__ import annotations

from typing import Any, Mapping

import httpx


_ALLOWED_HOST_PREFIXES = ("https://webhook.site",)


async def request(
    method: str, url: str, json: Mapping[str, Any] | None = None
) -> dict[str, Any]:
    """Perform a minimal HTTP request, primarily targeting webhook.site.

    To keep things safe and deterministic, requests are limited to a small
    allowlist of URL prefixes.
    """

    if not url.startswith(_ALLOWED_HOST_PREFIXES):
        raise ValueError("URL not allowed by HTTP tool policy")

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.request(method=method.upper(), url=url, json=json)
        return {
            "status_code": response.status_code,
            "headers": dict(response.headers),
            "body": response.text,
        }
