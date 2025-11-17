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
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ node, ...props }: any) => (
              <p className="mb-3 leading-relaxed" {...props} />
            ),
            ul: ({ node, ...props }: any) => (
              <ul
                className="mb-3 list-disc space-y-1 pl-6"
                {...props}
              />
            ),
            ol: ({ node, ...props }: any) => (
              <ol
                className="mb-3 list-decimal space-y-1 pl-6"
                {...props}
              />
            ),
            li: ({ node, ...props }: any) => (
              <li className="ml-2 leading-relaxed" {...props} />
            ),
            h1: ({ node, ...props }: any) => (
              <h1 className="mb-4 mt-6 text-xl font-bold" {...props} />
            ),
            h2: ({ node, ...props }: any) => (
              <h2 className="mb-3 mt-5 text-lg font-bold" {...props} />
            ),
            h3: ({ node, ...props }: any) => (
              <h3 className="mb-3 mt-4 text-base font-semibold" {...props} />
            ),
            table: ({ node, ...props }: any) => (
              <div className="my-4 overflow-x-auto">
                <table
                  className="w-full border-collapse text-sm"
                  {...props}
                />
              </div>
            ),
            th: ({ node, ...props }: any) => (
              <th
                className="border border-slate-300 bg-slate-100 px-4 py-2 text-left text-xs font-medium dark:border-slate-700 dark:bg-slate-800"
                {...props}
              />
            ),
            td: ({ node, ...props }: any) => (
              <td
                className="border border-slate-300 px-4 py-2 text-xs dark:border-slate-700"
                {...props}
              />
            ),
            hr: ({ node, ...props }: any) => (
              <hr
                className="my-6 border-slate-300 dark:border-slate-700"
                {...props}
              />
            ),
            blockquote: ({ node, ...props }: any) => (
              <blockquote
                className="my-4 border-l-4 border-slate-300 pl-4 italic dark:border-slate-700"
                {...props}
              />
            ),
          }}
        >
          {content}
        </ReactMarkdown>
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
    <div className="text-neutral-100">
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
