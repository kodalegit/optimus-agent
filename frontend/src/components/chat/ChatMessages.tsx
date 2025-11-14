"use client";

import type { ChatMessage } from "@/types/chat";
import { OptimizedMarkdown } from "@/components/chat/OptimizedMarkdown";

interface ChatMessagesProps {
  messages: ChatMessage[];
  streamingContent?: string;
  isStreaming?: boolean;
}

export function ChatMessages({
  messages,
  streamingContent,
  isStreaming,
}: ChatMessagesProps) {
  const hasMessages = messages.length > 0;
  const hasStreaming = Boolean(streamingContent && streamingContent.trim());

  if (!hasMessages && !hasStreaming) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      {messages.map((message) => {
        const isUser = message.role === "user";

        return (
          <div
            key={message.id}
            className={`flex w-full ${
              isUser ? "justify-end" : "justify-start"
            }`}
          >
            {isUser ? (
              <div className="max-w-[80%] rounded-2xl bg-sky-500 px-4 py-2.5 text-sm text-slate-950 shadow-sm">
                <div className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-900/80">
                  You
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {message.content}
                </p>
              </div>
            ) : (
              <div className="w-full max-w-3xl space-y-1">
                <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  OpsAgent
                </div>
                <OptimizedMarkdown content={message.content} />
              </div>
            )}
          </div>
        );
      })}

      {hasStreaming && (
        <div className="flex w-full justify-start">
          <div className="w-full max-w-3xl space-y-1">
            <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
              <span>OpsAgent</span>
              {isStreaming && (
                <span className="inline-flex items-center gap-1 text-[10px] text-sky-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-400" />
                  <span>Streaming</span>
                </span>
              )}
            </div>
            <OptimizedMarkdown content={streamingContent ?? ""} />
          </div>
        </div>
      )}
    </div>
  );
}
