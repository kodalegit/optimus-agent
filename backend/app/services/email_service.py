"""Send-mail mock service."""

from __future__ import annotations

import logging
from typing import Any


logger = logging.getLogger("email_mock")


async def send(to: str, subject: str, body: str) -> dict[str, Any]:
    """Send an email to the specified recipient and return a confirmation payload."""

    payload = {"to": to, "subject": subject, "body": body}
    logger.info("SEND-MAIL MOCK: %s", payload)
    return {"status": "sent", **payload}
