"use client";

import type {
  AgentStepKind,
  AgentStepStatus,
  AgentStreamEvent,
  AgentStreamStep,
} from "@/lib/api";

interface ExecutionTimelineProps {
  events: AgentStreamEvent[];
  isStreaming: boolean;
}

const STATUS_META: Record<
  AgentStepStatus,
  { icon: string; label: string; color: string }
> = {
  pending: { icon: "○", label: "Pending", color: "text-neutral-500" },
  in_progress: { icon: "◐", label: "In progress", color: "text-sky-400" },
  done: { icon: "✔", label: "Done", color: "text-emerald-400" },
  error: { icon: "⚠", label: "Error", color: "text-amber-400" },
};

const KIND_LABEL: Record<AgentStepKind, string> = {
  tool_call: "Tool call",
  tool_result: "Tool result",
  thought: "Agent thought",
  final: "Final answer",
};

export function ExecutionTimeline({
  events,
  isStreaming,
}: ExecutionTimelineProps) {
  const steps: AgentStreamStep[] = events
    .filter(
      (event): event is Extract<AgentStreamEvent, { type: "agent_step" }> => {
        return event.type === "agent_step";
      }
    )
    .map((event) => event.step);

  if (!steps.length && !isStreaming) {
    return null;
  }

  return (
    <section className="space-y-2 rounded-md border border-neutral-800 bg-neutral-950/40 p-3 text-xs">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
          Execution timeline
        </h2>
        <div className="flex flex-wrap items-center gap-3 text-[10px] text-neutral-500">
          {Object.entries(STATUS_META).map(([key, meta]) => (
            <span key={key} className="inline-flex items-center gap-1">
              <span className={meta.color}>{meta.icon}</span>
              <span>{meta.label}</span>
            </span>
          ))}
        </div>
      </div>

      {steps.length === 0 && isStreaming ? (
        <p className="text-[11px] text-neutral-500">
          Waiting for the first agent step...
        </p>
      ) : (
        <ol className="space-y-2">
          {steps.map((step, index) => {
            const statusMeta = STATUS_META[step.status];
            const kindLabel = KIND_LABEL[step.kind];
            const summaryId = `${step.node}-${index}`;
            return (
              <li key={summaryId} className="rounded-md bg-neutral-900/60">
                <details
                  className="group"
                  defaultValue={undefined}
                  open={index === steps.length - 1}
                >
                  <summary className="flex cursor-pointer items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-[11px] text-neutral-200 hover:border-neutral-700">
                    <span className={statusMeta.color}>{statusMeta.icon}</span>
                    <span className="font-medium">
                      Step {index + 1}: {step.label}
                    </span>
                    <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] text-neutral-300">
                      {kindLabel}
                    </span>
                    <span className="ml-auto text-[10px] text-neutral-500">
                      node: {step.node}
                    </span>
                  </summary>

                  <div className="space-y-1 border-t border-neutral-800 px-2 py-2 text-[11px] text-neutral-200">
                    {step.preview && (
                      <div className="rounded-md border border-neutral-800 bg-neutral-950/60 p-2 text-[10px] text-neutral-300">
                        Preview: {step.preview}
                      </div>
                    )}
                    {step.messages.map((message, messageIndex) => (
                      <div
                        key={messageIndex}
                        className="rounded-md bg-neutral-900/80 p-2"
                      >
                        <div className="mb-1 flex items-center gap-2 text-[10px] text-neutral-400">
                          <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] uppercase tracking-wide">
                            {message.type}
                          </span>
                          {message.name && (
                            <span className="text-[10px] text-neutral-500">
                              {message.name}
                            </span>
                          )}
                        </div>
                        <p className="whitespace-pre-wrap text-[11px] text-neutral-100">
                          {message.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </details>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
