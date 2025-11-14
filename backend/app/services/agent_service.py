"""Agent orchestration service powered by LangChain v1 agents."""

from __future__ import annotations

import json
from collections.abc import AsyncIterator
from functools import lru_cache
from typing import Any

from langchain.agents import create_agent
from langchain_core.messages import BaseMessage

from .llm_factory import get_chat_model
from .tool_registry import get_tools
from .telemetry import get_callback_handlers


DEFAULT_SYSTEM_PROMPT = (
    "You are OpsAgent, an internal operations assistant."
    " Use the provided tools to answer operational questions,"
    " cite data sources, and explain steps concisely."
)


@lru_cache(maxsize=4)
def _get_agent(provider: str, model_name: str):
    llm = get_chat_model(provider, model_name)
    tools = list(get_tools())
    callbacks = list(get_callback_handlers())
    return create_agent(
        llm,
        tools,
        system_prompt=DEFAULT_SYSTEM_PROMPT,
        callbacks=callbacks or None,
    )


async def run_agent_query(query: str, provider: str, model_name: str) -> str:
    """Execute the agent once and return the final text answer."""

    agent = _get_agent(provider, model_name)
    result = await agent.ainvoke({"messages": [{"role": "user", "content": query}]})

    messages = result.get("messages", []) if isinstance(result, dict) else []
    if not messages:
        return ""
    return _message_content_to_text(messages[-1])


async def stream_agent_events(
    query: str,
    provider: str,
    model_name: str,
) -> AsyncIterator[str]:
    """Yield SSE-formatted updates from the agent run using stream_mode='updates'."""

    agent = _get_agent(provider, model_name)
    final_text: str | None = None

    async for chunk in agent.astream(
        {"messages": [{"role": "user", "content": query}]},
        stream_mode="updates",
    ):
        for node, payload in chunk.items():
            messages = payload.get("messages", []) if isinstance(payload, dict) else []
            if not messages:
                continue
            serialized = [_serialize_message(msg) for msg in messages]
            for raw, ser in zip(messages, serialized):
                if getattr(raw, "type", "") == "ai" and not getattr(
                    raw, "tool_calls", None
                ):
                    final_text = ser["content"]
            yield _format_sse(
                {"type": "agent_step", "node": node, "messages": serialized}
            )

    if final_text:
        yield _format_sse({"type": "final_answer", "content": final_text})


def _serialize_message(message: BaseMessage) -> dict[str, Any]:
    return {
        "type": getattr(message, "type", "message"),
        "content": _message_content_to_text(message),
    }


def _message_content_to_text(message: BaseMessage) -> str:
    content = getattr(message, "content", "")
    if isinstance(content, list):
        parts: list[str] = []
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text":
                parts.append(block.get("text", ""))
        if parts:
            return "\n".join(parts)
        return json.dumps(content)
    return str(content)


def _format_sse(payload: dict[str, Any]) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"
