"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  streamAgentUpdates,
  uploadRagDocument,
  searchRagDocuments,
  type AgentQueryRequest,
  type RagSearchResult,
  type AgentStreamEvent,
} from "@/lib/api";
import { ExecutionTimeline } from "@/components/ExecutionTimeline";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { ChatInput } from "@/components/chat/ChatInput";
import type { ChatMessage } from "@/types/chat";
import { findModelOption, type ModelId } from "@/lib/models";
import { useChatScroll } from "@/hooks/useChatScroll";
import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";

type TabKey = "chat" | "documents";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabKey>("chat");
  const [modelId, setModelId] = useState<ModelId>("gpt-5-mini");

  const [input, setInput] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatError, setChatError] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [ragQuery, setRagQuery] = useState<string>("");
  const [ragResults, setRagResults] = useState<RagSearchResult[]>([]);
  const [ragError, setRagError] = useState<string | null>(null);

  const [streamEvents, setStreamEvents] = useState<AgentStreamEvent[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const streamAbortRef = useRef<AbortController | null>(null);

  const [streamingAssistantContent, setStreamingAssistantContent] =
    useState<string>("");

  const selectedModel = findModelOption(modelId);

  const {
    containerRef,
    showScrollButton,
    scrollToBottom,
    handleScroll,
    autoScrollOnChange,
  } = useChatScroll();

  const agentMutation = useMutation({
    mutationFn: async (payload: AgentQueryRequest) => {
      if (streamAbortRef.current) {
        streamAbortRef.current.abort();
      }

      const controller = new AbortController();
      streamAbortRef.current = controller;

      setStreamEvents([]);
      setStreamError(null);
      setIsStreaming(true);
      setStreamingAssistantContent("");

      let latestText = "";

      try {
        await streamAgentUpdates(
          payload,
          (event) => {
            setStreamEvents((previous) => [...previous, event]);

            if (event.type === "final_answer") {
              latestText = event.content;
              setStreamingAssistantContent(event.content);
              return;
            }

            if (event.type === "agent_step") {
              const aiMessages = event.step.messages.filter(
                (message) => message.type === "ai"
              );
              const last = aiMessages[aiMessages.length - 1];
              if (last) {
                latestText = last.content;
                setStreamingAssistantContent(last.content);
              }
            }
          },
          controller.signal
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to stream agent response";
        setStreamError(message);
      } finally {
        setIsStreaming(false);
        streamAbortRef.current = null;
      }

      return { message: latestText };
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (f: File) => uploadRagDocument(f),
  });

  const ragSearchMutation = useMutation({
    mutationFn: (query: string) =>
      searchRagDocuments({
        query,
      }),
  });

  useEffect(() => {
    autoScrollOnChange();
  }, [messages, streamEvents, streamingAssistantContent]);

  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || agentMutation.isPending) return;

    setChatError(null);
    setStreamError(null);

    setMessages((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        role: "user",
        content: trimmed,
      },
    ]);
    setInput("");

    try {
      const response = await agentMutation.mutateAsync({
        query: trimmed,
        model_provider: selectedModel.provider,
        model_name: selectedModel.modelName,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          role: "assistant",
          content: response.message,
        },
      ]);
      setStreamingAssistantContent("");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to run agent query";
      setChatError(message);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    setFile(nextFile);
    setUploadStatus(null);
  };

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file || uploadMutation.isPending) return;

    setUploadStatus(null);
    setRagError(null);

    try {
      const result = await uploadMutation.mutateAsync(file);
      setUploadStatus(
        `Uploaded document #${result.document_id} (${result.status})`
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to upload document";
      setRagError(message);
    }
  };

  const handleRagSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = ragQuery.trim();
    if (!trimmed || ragSearchMutation.isPending) return;

    setRagError(null);

    try {
      const results = await ragSearchMutation.mutateAsync(trimmed);
      setRagResults(results);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to search documents";
      setRagError(message);
      setRagResults([]);
    }
  };

  const isChatTab = activeTab === "chat";

  return (
    <div className="flex min-h-screen justify-center bg-neutral-950 px-4 py-8 text-neutral-50">
      <main className="flex w-full max-w-5xl flex-col gap-4 rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 shadow-lg">
        <header className="flex flex-col gap-1 border-b border-neutral-800 pb-3 sm:flex-row sm:items-baseline sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
              OpsAgent
            </h1>
            <p className="text-xs text-neutral-400 sm:text-sm">
              Internal operations assistant with tools, RAG, and multi-model
              support.
            </p>
          </div>
          <div className="mt-1 text-[11px] text-neutral-500 sm:mt-0">
            <span className="font-medium text-neutral-300">Model: </span>
            <span>{selectedModel.label}</span>
          </div>
        </header>

        <div className="flex items-center gap-2 border-b border-neutral-800 pb-2 text-sm">
          <button
            type="button"
            onClick={() => setActiveTab("chat")}
            className={`rounded-md px-3 py-1.5 ${
              isChatTab
                ? "bg-neutral-50 text-neutral-950"
                : "bg-transparent text-neutral-400 hover:bg-neutral-800"
            }`}
          >
            Chat
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("documents")}
            className={`rounded-md px-3 py-1.5 ${
              !isChatTab
                ? "bg-neutral-50 text-neutral-950"
                : "bg-transparent text-neutral-400 hover:bg-neutral-800"
            }`}
          >
            Documents
          </button>
        </div>

        {isChatTab ? (
          <section className="relative flex flex-1 flex-col gap-3">
            <div
              ref={containerRef}
              onScroll={handleScroll}
              className="flex-1 space-y-3 overflow-y-auto rounded-md border border-neutral-800 bg-neutral-950/40 p-4 text-sm"
            >
              {messages.length === 0 ? (
                <p className="text-neutral-500">
                  Ask Optimus an operational question to get started.
                </p>
              ) : (
                <ChatMessages
                  messages={messages}
                  streamingContent={streamingAssistantContent}
                  isStreaming={isStreaming || agentMutation.isPending}
                  timeline={
                    (isStreaming ||
                      agentMutation.isPending ||
                      streamEvents.length > 0) && (
                      <ExecutionTimeline
                        events={streamEvents}
                        isStreaming={
                          isStreaming || agentMutation.isPending
                        }
                      />
                    )
                  }
                />
              )}
            </div>

            {streamError && (
              <p className="text-xs text-red-400">{streamError}</p>
            )}

            {chatError && <p className="text-xs text-red-400">{chatError}</p>}

            <ChatInput
              value={input}
              onChange={setInput}
              onSubmit={handleSend}
              disabled={agentMutation.isPending}
              selectedModelId={modelId}
              onModelChange={(id) => setModelId(id as ModelId)}
              isStreaming={isStreaming || agentMutation.isPending}
            />

            {showScrollButton && (
              <div className="pointer-events-none absolute inset-x-0 bottom-24 flex justify-center">
                <Button
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  className="pointer-events-auto h-8 w-8 rounded-full border-slate-700 bg-slate-900/90 text-slate-100 shadow-sm hover:bg-slate-800"
                  onClick={scrollToBottom}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </section>
        ) : (
          <section className="flex flex-col gap-4 text-sm">
            <form
              onSubmit={handleUpload}
              className="flex flex-col gap-2 rounded-md border border-neutral-800 bg-neutral-950/40 p-3 sm:flex-row sm:items-center"
            >
              <div className="flex-1 space-y-1">
                <label className="text-xs font-medium text-neutral-300">
                  Upload document (PDF or text)
                </label>
                <input
                  type="file"
                  accept=".pdf,.txt,.md,.doc,.docx,application/pdf,text/plain"
                  onChange={handleFileChange}
                  className="block w-full text-xs text-neutral-300 file:mr-3 file:rounded-md file:border-0 file:bg-neutral-800 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-neutral-50 hover:file:bg-neutral-700"
                />
              </div>
              <button
                type="submit"
                disabled={!file || uploadMutation.isPending}
                className="mt-2 inline-flex items-center justify-center rounded-md bg-neutral-100 px-3 py-2 text-xs font-medium text-neutral-900 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 sm:mt-5"
              >
                {uploadMutation.isPending ? "Uploading..." : "Upload"}
              </button>
            </form>

            <form
              onSubmit={handleRagSearch}
              className="flex flex-col gap-2 rounded-md border border-neutral-800 bg-neutral-950/40 p-3 sm:flex-row sm:items-center"
            >
              <div className="flex-1 space-y-1">
                <label className="text-xs font-medium text-neutral-300">
                  Search indexed documents
                </label>
                <input
                  type="text"
                  value={ragQuery}
                  onChange={(event) => setRagQuery(event.target.value)}
                  placeholder="Ask something that should be grounded in your uploads..."
                  className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-50 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <button
                type="submit"
                disabled={ragSearchMutation.isPending}
                className="mt-2 inline-flex items-center justify-center rounded-md bg-neutral-100 px-3 py-2 text-xs font-medium text-neutral-900 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 sm:mt-5"
              >
                {ragSearchMutation.isPending ? "Searching..." : "Search"}
              </button>
            </form>

            {ragError && <p className="text-xs text-red-400">{ragError}</p>}
            {uploadStatus && (
              <p className="text-xs text-emerald-400">{uploadStatus}</p>
            )}

            <div className="space-y-2 rounded-md border border-neutral-800 bg-neutral-950/40 p-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                RAG results
              </h2>
              {ragResults.length === 0 ? (
                <p className="text-xs text-neutral-500">
                  No results yet. Upload a document and run a search.
                </p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {ragResults.map((chunk) => (
                    <li
                      key={chunk.id}
                      className="rounded-md border border-neutral-800 bg-neutral-900/60 p-2"
                    >
                      <div className="mb-1 flex items-center justify-between text-xs text-neutral-400">
                        <span>Document #{chunk.document_id}</span>
                        <span>Score: {chunk.score.toFixed(3)}</span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm text-neutral-50">
                        {chunk.content}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
