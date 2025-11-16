"use client";

import type { ReactNode } from "react";
import type { ChatMessage } from "@/types/chat";
import { OptimizedMarkdown } from "@/components/chat/OptimizedMarkdown";

interface ChatMessagesProps {
  messages: ChatMessage[];
  streamingContent?: string;
  isStreaming?: boolean;
  timeline?: ReactNode;
}

export function ChatMessages({
  messages,
  streamingContent,
  isStreaming,
  timeline,
}: ChatMessagesProps) {
  const hasMessages = messages.length > 0;
  const hasStreaming = Boolean(streamingContent && streamingContent.trim());

  if (!hasMessages && !hasStreaming) {
    return null;
  }

  const lastUserIndex = (() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index]?.role === "user") {
        return index;
      }
    }
    return -1;
  })();

  const leadingMessages =
    lastUserIndex === -1 ? messages : messages.slice(0, lastUserIndex + 1);
  const trailingMessages =
    lastUserIndex === -1 ? [] : messages.slice(lastUserIndex + 1);

  return (
    <div className="flex flex-col gap-4">
      {leadingMessages.map((message) => {
        const isUser = message.role === "user";

        return (
          <div
            key={message.id}
            className={`flex w-full ${
              isUser ? "justify-end" : "justify-start"
            }`}
          >
            {isUser ? (
              <div className="max-w-[80%] rounded-2xl border border-sky-500/60 bg-sky-500/10 px-4 py-2.5 text-sm text-neutral-50 shadow-sm backdrop-blur">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {message.content}
                </p>
              </div>
            ) : (
              <div className="w-full max-w-3xl space-y-1">
                <div className="text-[11px] font-medium uppercase tracking-wide text-sky-400">
                  Optimus
                </div>
                <OptimizedMarkdown content={message.content} />
              </div>
            )}
          </div>
        );
      })}

      {lastUserIndex !== -1 && timeline && (
        <div className="flex w-full justify-start">
          <div className="w-full max-w-3xl">{timeline}</div>
        </div>
      )}

      {trailingMessages.map((message) => {
        if (message.role === "user") {
          // Trailing user messages after the latest one that triggered the
          // current timeline are unlikely, but render them as normal bubbles.
          return (
            <div
              key={message.id}
              className="flex w-full justify-end"
            >
              <div className="max-w-[80%] rounded-2xl border border-sky-500/60 bg-sky-500/10 px-4 py-2.5 text-sm text-neutral-50 shadow-sm backdrop-blur">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {message.content}
                </p>
              </div>
            </div>
          );
        }

        return (
          <div key={message.id} className="flex w-full justify-start">
            <div className="w-full max-w-3xl space-y-1">
              <div className="text-[11px] font-medium uppercase tracking-wide text-sky-400">
                Optimus
              </div>
              <OptimizedMarkdown content={message.content} />
            </div>
          </div>
        );
      })}

      {hasStreaming && (
        <div className="flex w-full justify-start">
          <div className="w-full max-w-3xl space-y-1">
            {isStreaming && (
              <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-sky-400">
                <span>Optimus</span>
                <span className="inline-flex items-center gap-1 text-[10px] text-sky-400">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-400" />
                  <span>Responding...</span>
                </span>
              </div>
            )}
            <OptimizedMarkdown content={streamingContent ?? ""} />
          </div>
        </div>
      )}
    </div>
  );
}
