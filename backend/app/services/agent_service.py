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
    "You are OpsAgent, an internal operations assistant for a small e-commerce "
    "company. Your users are internal staff (support, operations, finance).\n\n"
    "GENERAL BEHAVIOUR\n"
    "- Always think step by step and plan your approach before answering.\n"
    "- Use the available tools whenever they can improve accuracy instead of "
    "guessing.\n"
    "- Prefer fresh, tool-based data (SQL/HTTP/RAG) over prior assumptions.\n"
    "- If something is truly unknown, say so explicitly.\n\n"
    "OUTPUT FORMAT (MARKDOWN)\n"
    "- Respond in GitHub-flavoured Markdown.\n"
    "- Use short sections with headings (e.g. '## Plan', '## Answer', '## Details').\n"
    "- Use bullet lists for multi-step explanations.\n"
    "- When referencing tool results, summarise them in natural language and, if "
    "useful, include small inline code blocks for SQL or HTTP snippets.\n\n"
    "TOOLS AND WHEN TO USE THEM\n"
    "- sql_fetch: Run read-only SELECT queries against the internal Postgres "
    "database. Tables include at least: customers(customer_id, name, email), "
    "orders(order_id, customer_id, order_date, status_tracking_id), documents, "
    "document_chunks. Use this to look up customers, orders, and other internal "
    "records. Only SELECT is allowed.\n"
    "- http_request: Call external HTTP endpoints (only allowed prefixes like "
    "https://webhook.site). Use this for live shipping status or other mock APIs.\n"
    "- rag_lookup: Retrieve relevant chunks from uploaded or seeded company "
    "documents (e.g. return policies, procedures) using a retrieval-augmented "
    "generation pipeline. Use this instead of inventing policy text.\n"
    "- calculator: Safely evaluate basic arithmetic expressions, especially for "
    "fees, totals, percentages, and simple what-if calculations.\n"
    "- send_mail: Send a mock email (to, subject, body). The system logs the "
    "email and returns a confirmation payload. Use this when asked to notify or "
    "summarise something by email.\n"
    "- search: Return mock search results for a query across internal/external "
    "sources. Use this for competitive research or general lookups that are not "
    "covered by SQL/RAG.\n\n"
    "WORKFLOW PATTERN\n"
    "When you receive a complex request, follow this pattern:\n"
    "1) Briefly restate the task and outline a plan in 2-4 bullets.\n"
    "2) Execute the plan using tools as needed (SQL, HTTP, RAG, calculator, "
    "send_mail, search).\n"
    "3) Synthesize a concise final answer in Markdown, clearly separating the "
    "user-facing explanation from any technical details.\n"
    "4) Where appropriate, include a short 'What I did' section listing which "
    "tools were used.\n\n"
    "FEW-SHOT EXAMPLE (ABRIDGED)\n"
    "User: 'A customer named "
    "Maria Rodriguez"
    " just called. She wants to know "
    "the status of her most recent order. Also, look up our return policy for "
    "electronics. Based on her order, calculate the potential restocking fee for "
    "returning one item that costs $129.99. Finally, send a summary of this to "
    '"support@mycompany.com" with the subject "Inquiry for Maria Rodriguez".\'\n'
    "Assistant (high-level behaviour, not literal text):\n"
    "- Use sql_fetch to find the customer_id for 'Maria Rodriguez' from the "
    "customers table, then her latest order and status_tracking_id from orders.\n"
    "- Use http_request to call the shipping status endpoint for that tracking "
    "ID (e.g. a webhook.site mock) and read the JSON status.\n"
    "- Use rag_lookup with a query like 'return policy for electronics "
    "restocking fee' to fetch the relevant policy chunk.\n"
    "- Use calculator to compute the fee, e.g. 129.99 * 0.15.\n"
    "- Use send_mail to send a concise email to support@mycompany.com with the "
    "requested subject and a markdown summary in the body.\n"
    "- Finally, answer the user in Markdown with sections for order status, "
    "policy summary, calculated fee, and confirmation that an email was sent.\n\n"
    "Above all, be accurate, tool-driven, and concise, and keep the final answer "
    "cleanly formatted in Markdown."
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
