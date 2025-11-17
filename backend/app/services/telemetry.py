"""Langfuse / telemetry helpers."""

from functools import lru_cache
from typing import Sequence

from langchain_core.callbacks import BaseCallbackHandler
from langfuse.langchain import CallbackHandler

from ..config import get_settings


@lru_cache(maxsize=1)
def get_callback_handlers() -> Sequence[BaseCallbackHandler]:
    """Return LangChain callback handlers for telemetry.

    If Langfuse credentials are not configured, this returns an empty tuple so
    the rest of the code can run without telemetry.
    """

    settings = get_settings()
    if not (settings.langfuse_public_key and settings.langfuse_secret_key):
        return tuple()

    # Langfuse v3 integration: CallbackHandler reads LANGFUSE_PUBLIC_KEY,
    # LANGFUSE_SECRET_KEY, and LANGFUSE_BASE_URL from the environment via the
    # Langfuse client. We only instantiate it if credentials are configured.
    handler: BaseCallbackHandler = CallbackHandler()
    return (handler,)
