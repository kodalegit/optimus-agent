## Optimus Agent – Take‑Home Implementation Overview

This project implements the **LLM & AI Agent Engineer technical test**: a full‑stack AI agent system with a Python backend, a React/Next.js frontend, pgvector RAG, Langfuse observability, and a Docker Compose setup that runs the entire stack

---

## 1. System Overview

- **Backend**: FastAPI + LangChain agents (Python)
- **Frontend**: Next.js (App Router, React, Tailwind/shadcn‑style UI)
- **Database**: Postgres with **pgvector** extension
- **RAG**: OpenAI embeddings stored in `pgvector` via SQLAlchemy models
- **Agent tools**:
  - Mock search tool
  - Calculator tool
  - Document RAG lookup
  - Send‑mail mock
  - HTTP GET/POST tool (mocked against webhook.site)
  - SQL fetch tool (read‑only queries)
- **LLM providers**: OpenAI and Google Gemini, selectable from the UI
- **LLMOps**: Langfuse v3 via LangChain callback handler
- **Runtime**: All services started with `docker compose up`

The main user flow:

- Upload documents into the RAG store via the **Knowledge Base** page
- Chat with the **Optimus** agent on the **Chat** page
- Watch tools and reasoning unfold in a **multi‑step execution timeline** with status icons

---

## 1.1. Cloning the Repository

Clone this repository locally before running any commands:

```bash
git clone <your-fork-or-repo-url>
cd optimus-agent
```

Then follow the steps below to configure environment variables and start the stack with Docker Compose.

## 2. Running the System

### 2.1. Prerequisites

- Docker & Docker Compose
- API keys for:
  - `OPENAI_API_KEY`
  - `GOOGLE_API_KEY`

### 2.2. Environment Variables

At the repo root you will find `.env.example`:

```bash
OPENAI_API_KEY=
GOOGLE_API_KEY=
LANGFUSE_PUBLIC_KEY=
LANGFUSE_SECRET_KEY=
```

Steps:

- Copy it to `.env`:

```bash
cp .env.example .env
```

- Fill in your API keys:
  - `OPENAI_API_KEY`: OpenAI key used by the backend agent
  - `GOOGLE_API_KEY`: Google Gemini key used by the backend agent
  - `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY`: keys from your Langfuse project (see next section)

> The backend reads these from `.env` via `pydantic_settings.Settings` in `backend/app/config.py`, and they are also passed into the backend service from `docker-compose.yml`.

### 2.3. Langfuse Onboarding

Langfuse (web + worker + infra) is fully managed inside Docker Compose.

1. **Boot everything once** (no keys needed yet):

   ```bash
   docker compose up
   ```

2. **Open Langfuse UI** at `http://localhost:3001`.

3. **Sign up** in Langfuse and create an **organization** (if prompted) and a **project**.

4. In the Langfuse UI, go to **Project Settings → API Keys** and create an API key pair.

5. Copy the keys into your root `.env`:

   ```bash
   LANGFUSE_PUBLIC_KEY=...
   LANGFUSE_SECRET_KEY=...
   ```

6. **Restart the stack** so the backend picks up the keys (rebuild recommended):

   ```bash
   docker compose down
   docker compose up --build
   ```

When `LANGFUSE_PUBLIC_KEY` and `LANGFUSE_SECRET_KEY` are set, the backend’s `telemetry.get_callback_handlers()` creates a Langfuse `CallbackHandler` so all agent runs, prompts, completions, and tool calls are traced.

### 2.4. URLs

- **Frontend UI**: `http://localhost:3000`
- **Backend API**: `http://localhost:8000` (FastAPI, prefixed with `/api/v1`)
- **Langfuse UI**: `http://localhost:3001`
- **Postgres (pgvector)**: `localhost:5432` (internal DSN used in Docker)

`docker-compose.yml` starts:

- `db` (pgvector Postgres)
- `backend` (FastAPI agent API)
- `frontend` (Next.js)
- `langfuse-web`, `langfuse-worker`, `langfuse-db`, `clickhouse`, `minio`, `redis` (Langfuse stack)

---

## 3. Backend Architecture (FastAPI + LangChain)

Backend root: `backend/app`.

- **Entrypoint**: `main.py`

  - Creates FastAPI app with CORS, mounts versioned router under `/api/v1`.
  - `lifespan` calls `core.db.init_db()` to:
    - Ensure `vector` extension exists
    - Create tables from SQLAlchemy models
    - Create HNSW index on `document_chunks.embedding`
    - Seed example rows in `customers` and `orders` for the SQL tool.

- **Config**: `config.py`

  - `Settings` from `.env` via `pydantic_settings`.
  - Fields include `database_url`, `embedding_model_name`, RAG chunk settings, and keys for OpenAI, Google, Langfuse.

- **Database**: `core/db.py` and `core/models.py`
  - Async engine (`create_async_engine`) and `async_sessionmaker`.
  - `init_db()` sets up pgvector and schema.

### 3.1. Database Schema (pgvector + SQL tool tables)

`backend/app/core/models.py` defines:

- **`documents`**

  - `id` (PK)
  - `filename`
  - `content_type`
  - `metadata` (JSONB)
  - `created_at` (timestamp)

- **`document_chunks`**

  - `id` (PK)
  - `document_id` (FK → `documents.id`, cascade delete)
  - `chunk_index`
  - `content` (text)
  - `metadata` (JSONB)
  - `embedding` (`Vector(1536)`)

- **`customers`**

  - `customer_id` (PK)
  - `name` (full name, indexed)
  - `email`

- **`orders`**
  - `order_id` (PK)
  - `customer_id` (FK → `customers.customer_id`)
  - `order_date`
  - `status_tracking_id` (used for mock HTTP tracking lookups)

These tables support both the **RAG pipeline** and the **SQL fetch tool**.

### 3.2. RAG Pipeline

RAG logic lives in `services/rag_service.py` and `services/embeddings.py`, exposed via `api/v1/rag.py`.

- **Upload endpoint**: `POST /api/v1/rag/documents`

  - FastAPI route in `api/v1/rag.py` → `rag_service.index_document()`.
  - Accepts PDF or plain text (`UploadFile`).
  - Uses `PyMuPDF` (`fitz`) for PDF text extraction.
  - Splits text with `RecursiveCharacterTextSplitter` using `rag_chunk_size` / `rag_chunk_overlap`.
  - Embeds chunks via `get_embedding_provider()` (OpenAI) and stores vectors in `document_chunks.embedding`.

- **Search endpoint**: `POST /api/v1/rag/search`
  - Payload: `{ query: str, top_k: int }`.
  - Runs vector search using pgvector and returns a list of chunks with scores.

### 3.3. Agent & Tools

- **LLM factory**: `services/llm_factory.py`

  - `get_chat_model(provider, model_name)`:
    - `provider="openai"` → `ChatOpenAI` with `OPENAI_API_KEY`.
    - `provider="google"` → `ChatGoogleGenerativeAI` with `GOOGLE_API_KEY`.

- **Tools registry**: `services/tool_registry.py`

  - Declares LangChain tools using `@tool`:
    - `search` → `search_service.search()` (mock search)
    - `calculator` → `calculator_service.evaluate()`
    - `rag_lookup` → uses ephemeral DB session + `rag_service.query()`
    - `send_mail` → `email_service.send()` (logs only)
    - `http_request` → `http_service.request()` (mock webhook.site)
    - `sql_fetch` → `sql_service.fetch()` (read‑only SELECT)

- **Agent orchestration**: `services/agent_service.py`

  - Builds a LangChain v1 agent via `create_agent(llm, tools, system_prompt=SYSTEM_PROMPT)`.
  - `run_agent_query(query, provider, model_name)`
    - Runs the agent once and extracts the final answer using `<FINAL_ANSWER>...</FINAL_ANSWER>` delimiters.
  - `stream_agent_events(...)` (multi‑step reasoning stream)
    - Uses `agent.astream(..., stream_mode=["updates", "messages"])`.
    - For each tool call/result or thought step, emits an SSE event of shape:
      - `type: "agent_step" | "final_answer"`
      - `step` includes `node`, `label`, `status`, `kind`, `tool_name`, `preview`, and a list of messages.
    - Detects errors in tool results by inspecting structured `status` fields and fallbacks on “error” text.

- **Prompt**: `services/prompts.py`
  - `SYSTEM_PROMPT` defines the agent’s role, tool usage rules, SQL schema & usage constraints, and the `<FINAL_ANSWER>` delimiter contract.

### 3.4. Tool Implementations & Mocking Details

- **Search tool** – `services/search_service.py`

  - Returns deterministic mock results (`Result 1/2/3 for <query>`) pointing to `https://example.com/...`.

- **Calculator tool** – `services/calculator_service.py`

  - Parses arithmetic expressions with `ast` and evaluates only a safe subset of operators.

- **Document RAG lookup** – `services/rag_service.py`

  - Used via `rag_lookup` tool for semantic document search over pgvector.

- **Send‑mail mock** – `services/email_service.py`

  - Logs payload to a dedicated logger `email_mock` and returns a JSON confirmation:
    - `{ "status": "sent", "to": ..., "subject": ..., "body": ... }`.
  - No real email is sent.

- **HTTP GET/POST tool (mock webhook.site)** – `services/http_service.py`

  - Enforces a strict allowlist: only `https://webhook.site/...` URLs.
  - The actual HTTP call via `httpx.AsyncClient` is **commented out** to avoid flaky network behavior.
  - Instead, the service **deterministically mocks responses**:
    - If request JSON contains a string `tracking_id`, returns:
      - `{ status: "ok", http_status: 200, tracking_status: "in_transit", message: "Live tracking lookup succeeded.", ... }`.
    - If `tracking_id` is missing, returns an error payload with `http_status: 404` and `tracking_status: "unknown"`.
  - This matches the technical test intent (using webhook.site) while being robust to random tracking IDs and network issues.

- **SQL fetch tool** – `services/sql_service.py`
  - Uses its own `async_sessionmaker` bound to the shared engine.
  - Enforces `SELECT`‑only queries; anything else raises `ValueError`.
  - Returns `List[dict[str, Any]]` built from SQLAlchemy result mappings.

### 3.5. Langfuse Integration

- `services/telemetry.py`:

  - `get_callback_handlers()` reads Langfuse env vars via `get_settings()`.
  - If both `LANGFUSE_PUBLIC_KEY` and `LANGFUSE_SECRET_KEY` are set, it returns a single Langfuse `CallbackHandler`; otherwise, returns an empty tuple so the app runs without telemetry.

- `agent_service.py` passes these callbacks into the agent config (`config={"callbacks": handlers}`) for both `ainvoke` and `astream`, so Langfuse captures:
  - Prompts
  - Completions
  - Tool calls
  - Full multi‑step traces

Backend container receives `LANGFUSE_HOST` and `LANGFUSE_BASE_URL` pointing at the internal Langfuse web service from `docker-compose.yml`.

---

## 4. Backend API Surface

Mounted under `/api/v1` (see `app/api/v1/__init__.py`).

- **Health**

  - `GET /api/v1/health` (simple health check)

- **Agent** (`api/v1/agent.py`)

  - `POST /api/v1/agent/query`
    - Body: `{ query: string, model_provider: string, model_name: string }`
    - Returns: `{ message: string }` (final answer).
  - `POST /api/v1/agent/stream`
    - Same body as `/query`.
    - Returns server‑sent events (`text/event-stream`) with `agent_step` and `final_answer` events consumed by the frontend execution timeline.

- **RAG** (`api/v1/rag.py`)
  - `POST /api/v1/rag/documents` (multipart form‑data)
    - Field: `file` (PDF/TXT)
    - Returns: `{ status: "indexed", document_id: number }`.
  - `POST /api/v1/rag/search`
    - Body: `{ query: string, top_k?: number }`
    - Returns: `{ results: RagSearchResult[] }` where each result includes content, metadata, and score.

---

## 5. Frontend Architecture (Next.js)

Frontend root: `frontend/` (Next.js App Router).

- **API client**: `src/lib/api.ts`

  - `API_BASE_URL` from `NEXT_PUBLIC_API_BASE_URL` (defaults to `http://localhost:8000/api/v1`).
  - Functions:
    - `runAgentQuery` – calls `/agent/query`.
    - `streamAgentUpdates` – connects to `/agent/stream` and parses SSE `data:` lines into `AgentStreamEvent`s.
    - `uploadRagDocument` – calls `/rag/documents` with `FormData`.
    - `searchRagDocuments` – calls `/rag/search`.

- **Pages**:

  - `src/app/chat/page.tsx`

    - Main chat UI with:
      - Message history and assistant streaming preview
      - Model selection via `ModelId` (`openai` vs `google` under the hood)
      - Uses `streamAgentUpdates` to receive agent steps + final answer.
      - Renders **ExecutionTimeline** below messages while streaming.
    - Includes an **example scenario** prompt aligned with the ops use‑case (order status + policies + email summary).

  - `src/app/documents/page.tsx`
    - Document upload UI (**Knowledge Base**):
      - Drag‑and‑drop and file picker for PDF/TXT.
      - Uses `uploadRagDocument` mutation.
      - Shows status and error banners.
      - “How it works” card describing chunking + embeddings.

- **Execution Timeline**: `src/components/ExecutionTimeline.tsx`
  - Consumes `AgentStreamEvent[]` from SSE.
  - Aggregates into `AgentStreamStep[]` and shows a timeline:
    - Status icons:
      - `pending` = ○
      - `in_progress` = ◐
      - `done` = ✔
      - `error` = ⚠
    - Step kinds: `tool_call`, `tool_result`, `thought`, `final` (labeled badges).
    - Each step is **collapsible** (`<details>`), default‑open for the latest step while streaming and collapsible when final step arrives.
    - Shows per‑step messages (agent/tool text, tool names, etc.).

This satisfies the **Multi‑Step Reasoning UI** requirements: icons, collapsible steps, and progressive updates via streaming.

---

## 6. Requirement Mapping

- **Python backend with agent framework**: FastAPI + LangChain agent in `agent_service.py`
- **React/Next.js frontend**: Next.js app with dedicated chat and document pages
- **pgvector RAG**: Postgres + pgvector, `documents`/`document_chunks` models, HNSW index, RAG upload/search endpoints
- **Tools**:
  - Search tool (mock)
  - Calculator tool
  - Document RAG lookup
  - Send‑mail mock (logging)
  - HTTP GET/POST tool (mocked webhook.site)
  - SQL fetch tool (read‑only Postgres)
- **LLM switching**: OpenAI vs Google via `llm_factory.get_chat_model` + UI model selector
- **Multi‑step reasoning UI**: Execution timeline with status icons, collapsible steps, streaming updates
- **Langfuse LLMOps**: Optional but fully wired via LangChain callback handler and Dockerized Langfuse stack
- **Docker Compose**: Single `docker-compose.yml` starting backend, frontend, Postgres+pgvector, and Langfuse

---

## 7. How to Review the Implementation

- **RAG flow**:

  - Start stack → go to `http://localhost:3000/documents` → upload a PDF/TXT.
  - Confirm `Uploaded document #<id> (indexed)` message.

- **Agent + tools**:

  - Go to `http://localhost:3000/chat`.
  - Use the example query or craft a scenario referencing:
    - A seeded customer (e.g., “David Kim”) and order status.
    - A policy stored in your uploaded docs.
  - Watch Execution Timeline show:
    - SQL tool calls for `customers`/`orders`.
    - HTTP tracking lookups via mocked webhook.site.
    - RAG lookups for policy content.
    - Calculator for restocking fees.
    - Send‑mail mock step.

- **LLM switching**:

  - Change the model in the chat footer dropdown; verify both OpenAI and Google are reachable (given keys).

- **Langfuse traces**:
  - With keys configured, visit `http://localhost:3001` and open your project.
  - Trigger a few agent runs and confirm that traces, tool calls, and spans appear.
