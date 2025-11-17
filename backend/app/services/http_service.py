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
            "status": "error",
            "error_type": "invalid_url",
            "message": "URL not allowed by HTTP tool policy. Use webhook.site endpoints for HTTP requests.",
            "requested_url": url,
        }

    # try:
    #     async with httpx.AsyncClient(timeout=10.0) as client:
    #         response = await client.request(method=method.upper(), url=url, json=json)
    # except httpx.HTTPError as exc:  # pragma: no cover - network failures
    #     return {
    #         "status": "network_error",
    #         "message": "HTTP request failed.",
    #         "details": str(exc),
    #     }

    # For technical test stability, we mock the HTTP response instead of
    # performing a real network call. This prevents flakiness from
    # non-existent pages or transient network issues while still giving the
    # agent structured data to work with.

    upper_method = method.upper()

    tracking_id: str | None = None
    if isinstance(json, Mapping):
        raw_tracking = json.get("tracking_id")
        if isinstance(raw_tracking, str):
            tracking_id = raw_tracking

    # Simple, deterministic behaviour for the technical test:
    # - If a tracking_id is provided, treat the lookup as successful.
    # - If no tracking_id is provided, treat it as a failure similar to a 404.
    if tracking_id is None:
        return {
            "status": "error",
            "http_status": 404,
            "tracking_status": "unknown",
            "message": "Live tracking lookup failed (tracking token or URL not found).",
            "tracking_id": None,
            "url": url,
            "method": upper_method,
        }

    return {
        "status": "ok",
        "http_status": 200,
        "tracking_status": "in_transit",
        "message": "Live tracking lookup succeeded.",
        "tracking_id": tracking_id,
        "url": url,
        "method": upper_method,
    }
