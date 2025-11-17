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
from .prompts import SYSTEM_PROMPT


_TOOL_LABELS: dict[str, str] = {
    "sql_fetch": "Database lookup",
    "http_request": "External API call",
    "rag_lookup": "Knowledge base search",
    "calculator": "Calculate value",
    "send_mail": "Send email",
    "search": "Search knowledge base",
}

_REQUEST_LABELS: dict[str, str] = {
    "sql_fetch": "Searching internal database",
    "http_request": "Calling external API",
    "rag_lookup": "Searching knowledge base",
    "calculator": "Calculating",
    "send_mail": "Sending email",
    "search": "Searching knowledge base",
}

_RESULT_LABELS: dict[str, str] = {
    "sql_fetch": "Database result",
    "http_request": "API response",
    "rag_lookup": "Knowledge result",
    "calculator": "Calculation result",
    "send_mail": "Email sent",
    "search": "Search result",
}

_FINAL_ANSWER_DELIMITER = "<FINAL_ANSWER>"
_FINAL_ANSWER_CLOSING = "</FINAL_ANSWER>"


def _extract_final_answer(text: str) -> str:
    if not text:
        return ""
    index = text.find(_FINAL_ANSWER_DELIMITER)
    if index == -1:
        cleaned = text
    else:
        cleaned = text[index + len(_FINAL_ANSWER_DELIMITER) :].lstrip()
    return cleaned.replace(_FINAL_ANSWER_CLOSING, "")


@lru_cache(maxsize=4)
def _get_agent(provider: str, model_name: str):
    """Return a cached LangChain agent for the given provider/model."""

    llm = get_chat_model(provider, model_name)
    tools = list(get_tools())
    return create_agent(
        llm,
        tools,
        system_prompt=SYSTEM_PROMPT,
    )


async def run_agent_query(query: str, provider: str, model_name: str) -> str:
    """Execute the agent once and return the final text answer."""
    agent = _get_agent(provider, model_name)

    callbacks = list(get_callback_handlers())
    config: dict[str, Any] | None = {"callbacks": callbacks} if callbacks else None

    if config is not None:
        result = await agent.ainvoke(
            {"messages": [{"role": "user", "content": query}]},
            config=config,
        )
    else:
        result = await agent.ainvoke({"messages": [{"role": "user", "content": query}]})

    messages = result.get("messages", []) if isinstance(result, dict) else []
    if not messages:
        return ""
    raw_text = _message_content_to_text(messages[-1])
    return _extract_final_answer(raw_text)


async def stream_agent_events(
    query: str,
    provider: str,
    model_name: str,
) -> AsyncIterator[str]:
    """Yield SSE-formatted updates and messages from the agent run"""

    agent = _get_agent(provider, model_name)
    final_text: str | None = None
    pending_text: str = ""
    final_answer_started = False

    callbacks = list(get_callback_handlers())
    config: dict[str, Any] | None = {"callbacks": callbacks} if callbacks else None

    stream_kwargs: dict[str, Any] = {
        "stream_mode": ["updates", "messages"],
    }
    if config is not None:
        stream_kwargs["config"] = config

    async for mode, data in agent.astream(
        {"messages": [{"role": "user", "content": query}]},
        **stream_kwargs,
    ):
        if mode == "updates":
            chunk = data
            if not isinstance(chunk, dict):
                continue
            for node, payload in chunk.items():
                messages = (
                    payload.get("messages", []) if isinstance(payload, dict) else []
                )
                if not messages:
                    continue

                for raw in messages:
                    serialized = _serialize_message(raw)
                    message_type = serialized["type"]

                    if message_type == "ai":
                        tool_calls = serialized.get("tool_calls") or []
                        if tool_calls:
                            for call in tool_calls:
                                args_text = _format_tool_args(call.get("args"))
                                yield _format_sse(
                                    {
                                        "type": "agent_step",
                                        "step": {
                                            "node": node,
                                            "label": f"{_REQUEST_LABELS.get(call.get('name'), _friendly_tool_title(call.get('name')))}",
                                            "status": "pending",
                                            "kind": "tool_call",
                                            "tool_name": call.get("name"),
                                            "tool_call_id": call.get("id"),
                                            "preview": _preview_text(args_text),
                                            "messages": [
                                                {
                                                    "type": "tool_call",
                                                    "content": args_text,
                                                }
                                            ],
                                        },
                                    }
                                )

                    elif message_type == "tool":
                        raw_content = serialized["content"]
                        preview = _preview_text(raw_content)
                        tool_name = serialized.get("name")

                        # Prefer a structured status field from JSON tool payloads.
                        structured_status: str | None = None
                        try:
                            parsed = json.loads(raw_content)
                            if isinstance(parsed, dict):
                                raw_status = parsed.get("status")
                                if isinstance(raw_status, str):
                                    structured_status = raw_status.lower()
                        except Exception:  # JSON decoding is best-effort only
                            structured_status = None

                        if structured_status == "error":
                            status = "error"
                        else:
                            # Fallback to heuristic for tools that do not yet
                            # return a structured status field.
                            status = "error" if "error" in preview.lower() else "done"
                        yield _format_sse(
                            {
                                "type": "agent_step",
                                "step": {
                                    "node": node,
                                    "label": f"{_RESULT_LABELS.get(tool_name, _friendly_tool_title(tool_name))}",
                                    "status": status,
                                    "kind": "tool_result",
                                    "tool_name": tool_name,
                                    "tool_call_id": serialized.get("tool_call_id"),
                                    "preview": preview,
                                    "messages": [serialized],
                                },
                            }
                        )

                    else:
                        yield _format_sse(
                            {
                                "type": "agent_step",
                                "step": {
                                    "node": node,
                                    "label": "Agent update",
                                    "status": "in_progress",
                                    "kind": "thought",
                                    "messages": [serialized],
                                },
                            }
                        )

        elif mode == "messages":
            message_chunk, _metadata = data

            tool_calls = getattr(message_chunk, "tool_calls", None)
            if tool_calls:
                continue

            text = _message_content_to_text(message_chunk)
            if not text:
                continue

            pending_text += text

            if not final_answer_started:
                index = pending_text.find(_FINAL_ANSWER_DELIMITER)
                if index == -1:
                    continue

                final_answer_started = True

            combined = (final_text or "") + pending_text
            final_text = _extract_final_answer(combined)
            pending_text = ""
            yield _format_sse(
                {
                    "type": "final_answer",
                    "content": final_text,
                }
            )

    if not final_answer_started and pending_text:
        combined = (final_text or "") + pending_text
        final_text = _extract_final_answer(combined)
        yield _format_sse(
            {
                "type": "final_answer",
                "content": final_text,
            }
        )


def _serialize_message(message: BaseMessage) -> dict[str, Any]:
    data: dict[str, Any] = {
        "type": getattr(message, "type", "message"),
        "content": _message_content_to_text(message),
    }

    name = getattr(message, "name", None)
    if name:
        data["name"] = name

    tool_call_id = getattr(message, "tool_call_id", None)
    if tool_call_id:
        data["tool_call_id"] = tool_call_id

    tool_calls = getattr(message, "tool_calls", None)
    if tool_calls:
        normalized: list[dict[str, Any]] = []
        for call in tool_calls:
            normalized.append(_normalize_tool_call(call))
        data["tool_calls"] = normalized

    return data


def _message_content_to_text(message: BaseMessage) -> str:
    content = getattr(message, "content", "")
    if isinstance(content, list):
        parts: list[str] = []
        for block in content:
            if not isinstance(block, dict):
                continue
            block_type = block.get("type")
            if block_type == "text":
                parts.append(block.get("text", ""))
            elif block_type == "tool_call":
                name = block.get("name", "tool")
                args = _format_tool_args(block.get("args"))
                parts.append(f"Tool call -> {name}: {args}")
        if parts:
            return "\n".join(parts)
        return json.dumps(content, ensure_ascii=False)
    return str(content)


def _friendly_tool_title(name: str | None) -> str:
    if not name:
        return "Tool"
    return _TOOL_LABELS.get(name, name.replace("_", " ").title())


def _format_tool_args(args: Any) -> str:
    if args in (None, ""):
        return "No arguments provided."
    try:
        return json.dumps(args, ensure_ascii=False, indent=2)
    except TypeError:
        return str(args)


def _preview_text(text: str, limit: int = 160) -> str:
    snippet = text.strip()
    if len(snippet) <= limit:
        return snippet
    return f"{snippet[:limit].rstrip()}…"


def _normalize_tool_call(call: Any) -> dict[str, Any]:
    if isinstance(call, dict):
        return {
            "id": call.get("id"),
            "name": call.get("name"),
            "args": call.get("args", {}),
        }
    dict_method = getattr(call, "dict", None)
    if callable(dict_method):  # type: ignore[truthy-function]
        data = dict_method()
        return {
            "id": data.get("id"),
            "name": data.get("name"),
            "args": data.get("args", {}),
        }
    return {
        "id": getattr(call, "id", None),
        "name": getattr(call, "name", None),
        "args": getattr(call, "args", {}),
    }


def _format_sse(payload: dict[str, Any]) -> str:
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"
