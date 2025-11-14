# **LLM & AI Agent Engineer – Technical Test**

## **Overview**

Build a full-stack AI Agent System with:

- **Python backend**
- **React/Next.js frontend**
- **pgvector** for RAG
- **Langfuse** for LLMOps
- Entire system runnable via **Docker Compose**

The system should allow users to:

- Upload documents
- Query an AI agent
- See step-by-step reasoning with icons
- Switch between at least two LLMs

---

## **Backend (Python)**

Use **LangChain**, **LangGraph**, or **Google Agent Development Kit** to build an agent that can:

- Perform **multi-step reasoning**
- Use **RAG via pgvector**
- Switch between at least **two LLM providers/models**
- Call all tools defined below

---

## **Tools to Implement**

1. **Search tool** (mock search)
2. **Calculator tool**
3. **Document RAG lookup**
4. **Send-mail mock** (logs message locally)
5. **HTTP GET/POST tool** (mock using webhook.site)
6. **SQL fetch tool** (query a standard Postgres table)

---

## **RAG Requirements**

- Document upload endpoint
- Embed + store vectors in **pgvector**
- Retrieval pipeline

---

## **Frontend (React / Next.js)**

Simple UI with:

- Document upload page
- Query input page
- Dropdown to select LLM provider/model
- Display:

  - Final answer
  - Tool calls
  - RAG hits (optional)

---

## **Multi-Step Reasoning UI**

Show an **execution timeline** with:

- Icons for: pending, in-progress, done, error
- Each step should be **collapsible**
- Steps should update **progressively** or after completion

_No authentication required._

---

## **LLMOps**

Integrate **Langfuse** to log:

- Prompts
- Completions
- Tool calls
- Agent traces

---

## **Docker**

Provide a **Docker Compose** setup that runs:

- Backend
- Frontend
- Postgres + pgvector
- Langfuse

`docker compose up` should start the **entire system**.

---

## **GitHub Submission Requirements**

- Push the full project to **your GitHub account**
- Include:

  - `README.md`
  - `docker-compose.yml`
  - Clear project structure
