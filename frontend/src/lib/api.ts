export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export interface AgentQueryRequest {
  query: string;
  model_provider: string;
  model_name: string;
}

export interface AgentQueryResponse {
  message: string;
}

export type AgentStepStatus = "pending" | "in_progress" | "done" | "error";

export type AgentStepKind = "tool_call" | "tool_result" | "thought" | "final";

export interface AgentStreamStepMessage {
  type: string;
  content: string;
  name?: string;
}

export interface AgentStreamStep {
  node: string;
  label: string;
  status: AgentStepStatus;
  kind: AgentStepKind;
  tool_name?: string;
  tool_call_id?: string;
  preview?: string;
  messages: AgentStreamStepMessage[];
}

export type AgentStreamEvent =
  | {
      type: "agent_step";
      step: AgentStreamStep;
    }
  | {
      type: "final_answer";
      content: string;
    };

async function handleJsonResponse<T>(
  res: Response,
  fallbackError: string
): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || fallbackError);
  }
  return (await res.json()) as T;
}

export async function runAgentQuery(
  payload: AgentQueryRequest
): Promise<AgentQueryResponse> {
  const res = await fetch(`${API_BASE_URL}/agent/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return handleJsonResponse<AgentQueryResponse>(
    res,
    "Failed to run agent query"
  );
}

export async function streamAgentUpdates(
  payload: AgentQueryRequest,
  onEvent: (event: AgentStreamEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/agent/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Failed to start agent stream");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const lines = part.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data:")) continue;
        const jsonStr = trimmed.slice("data:".length).trim();
        if (!jsonStr) continue;
        try {
          const parsed = JSON.parse(jsonStr) as AgentStreamEvent;
          if (parsed && typeof parsed === "object" && "type" in parsed) {
            onEvent(parsed);
          }
        } catch {
          // Ignore malformed SSE payloads
        }
      }
    }
  }
}

export interface RagSearchResult {
  id: number;
  document_id: number;
  content: string;
  metadata: Record<string, unknown>;
  score: number;
}

export async function uploadRagDocument(file: File): Promise<{
  status: string;
  document_id: number;
}> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE_URL}/rag/documents`, {
    method: "POST",
    body: formData,
  });

  return handleJsonResponse(res, "Failed to upload document");
}

export async function searchRagDocuments(params: {
  query: string;
  top_k?: number;
}): Promise<RagSearchResult[]> {
  const res = await fetch(`${API_BASE_URL}/rag/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: params.query, top_k: params.top_k ?? 5 }),
  });

  const data = await handleJsonResponse<{ results: RagSearchResult[] }>(
    res,
    "Failed to search documents"
  );

  return data.results;
}
