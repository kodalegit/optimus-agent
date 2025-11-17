"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  streamAgentUpdates,
  type AgentQueryRequest,
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

export default function ChatPage() {
  const [modelId, setModelId] = useState<ModelId>("gpt-5-mini");
  const [input, setInput] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatError, setChatError] = useState<string | null>(null);

  const [streamEvents, setStreamEvents] = useState<AgentStreamEvent[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const streamAbortRef = useRef<AbortController | null>(null);

  const [streamingAssistantContent, setStreamingAssistantContent] =
    useState<string>("");

  const selectedModel = findModelOption(modelId);

  const exampleQuery =
    "A customer named David Kim just called. He wants to know the status of his most recent order. Also, look up our return policy for electronics. Based on his order, calculate the potential restocking fee for returning one item that costs $129.99. Finally, send a summary of this to 'ops-support@example.com' with the subject 'Inquiry for David Kim'.";

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
                (message) => message.type === "ai",
              );
              const last = aiMessages[aiMessages.length - 1];
              if (last) {
                latestText = last.content;
                setStreamingAssistantContent(last.content);
              }
            }
          },
          controller.signal,
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

  useEffect(() => {
    autoScrollOnChange();
  }, [messages, streamEvents, streamingAssistantContent, autoScrollOnChange]);

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

  return (
    <div className="flex min-h-screen flex-col gap-4 pb-28">
      <header className="sticky top-2 z-20 flex flex-col gap-1 border-b border-slate-800/80 bg-slate-950/95 pb-3 backdrop-blur sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
            Chat
          </h1>
          <p className="text-xs text-slate-400 sm:text-sm">
            Converse with Optimus, your internal operations assistant.
          </p>
        </div>
        <div className="mt-1 text-[11px] text-slate-500 sm:mt-0">
          <span className="font-medium text-slate-300">Model: </span>
          <span>{selectedModel.label}</span>
        </div>
      </header>

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/60">
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="flex-1 space-y-3 overflow-y-auto px-4 py-4 pb-6 text-sm"
        >
          {messages.length === 0 && !streamingAssistantContent ? (
            <div className="space-y-3 text-sm text-slate-300">
              <p className="text-slate-400">
                Start by asking about real-world operational scenarios. Optimus
                can combine tools, RAG, and email to resolve a case end-to-end.
              </p>
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/70 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Try this scenario
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-slate-200">
                  A customer calls about a recent order and wants to know its
                  status, whether an electronics item is returnable, what
                  restocking fee applies, and to have a summary emailed to
                  support.
                </p>
                <p className="mt-2 text-[11px] text-slate-500">
                  Use the <span className="font-medium text-sky-400">Example query</span>{" "}
                  button below to prefill this scenario.
                </p>
              </div>
            </div>
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
                    isStreaming={isStreaming || agentMutation.isPending}
                  />
                )
              }
            />
          )}
        </div>

        {streamError && (
          <p className="px-4 text-xs text-red-400">{streamError}</p>
        )}

        {chatError && <p className="px-4 text-xs text-red-400">{chatError}</p>}

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

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-900/80 bg-slate-950/90 backdrop-blur md:left-64 md:right-0">
        <div className="mx-auto w-full max-w-5xl px-4 py-3">
          <ChatInput
            value={input}
            onChange={setInput}
            onSubmit={handleSend}
            disabled={agentMutation.isPending}
            selectedModelId={modelId}
            onModelChange={(id) => setModelId(id as ModelId)}
            isStreaming={isStreaming || agentMutation.isPending}
            onExampleClick={() => setInput(exampleQuery)}
          />
        </div>
      </div>
    </div>
  );
}
