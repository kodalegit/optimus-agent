"use client";

import React, { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface OptimizedMarkdownProps {
  content: string;
}

// Parse markdown into reasonably sized blocks for streaming-friendly rendering
function parseMarkdownIntoBlocks(markdown: string): string[] {
  return markdown
    .split(/\n\n+/)
    .map((block) => block.trim())
    .filter(Boolean);
}

const MemoizedMarkdownBlock = memo(
  ({ content }: { content: string }) => {
    return (
      <div className="prose prose-slate dark:prose-invert max-w-none text-sm leading-relaxed">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    );
  },
  (previous, next) => previous.content === next.content,
);

export function OptimizedMarkdown({ content }: OptimizedMarkdownProps) {
  const blocks = useMemo(() => parseMarkdownIntoBlocks(content), [content]);

  if (!content.trim()) {
    return null;
  }

  return (
    <div className="text-foreground">
      {blocks.map((block, index) => (
        <MemoizedMarkdownBlock
          // eslint-disable-next-line react/no-array-index-key
          key={`markdown-block-${index}`}
          content={block}
        />
      ))}
    </div>
  );
}
