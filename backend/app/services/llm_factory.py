"""Factory helpers for constructing chat models."""

from langchain_core.language_models import BaseChatModel
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI

from ..config import get_settings


class UnsupportedProviderError(ValueError):
    """Raised when a requested LLM provider does not exist."""


def get_chat_model(provider: str, model_name: str) -> BaseChatModel:
    """Return an initialized chat model based on provider name."""

    settings = get_settings()

    if provider == "openai":
        if not settings.openai_api_key:
            raise RuntimeError("Missing OpenAI API key")
        return ChatOpenAI(model=model_name, api_key=settings.openai_api_key)

    if provider == "google":
        if not settings.google_api_key:
            raise RuntimeError("Missing Google API key")
        return ChatGoogleGenerativeAI(
            model=model_name, google_api_key=settings.google_api_key
        )

    raise UnsupportedProviderError(f"Unknown provider: {provider}")
