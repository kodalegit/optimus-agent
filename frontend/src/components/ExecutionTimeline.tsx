"use client";

import type { AgentStreamEvent } from "@/lib/api";

type AgentStepEvent = Extract<AgentStreamEvent, { type: "agent_step" }>;

interface ExecutionTimelineProps {
  events: AgentStreamEvent[];
  isStreaming: boolean;
}

type StepStatus = "in_progress" | "done";

const STATUS_ICON: Record<StepStatus, { icon: string; label: string }> = {
  in_progress: { icon: "◐", label: "In progress" },
  done: { icon: "✔", label: "Done" },
};

export function ExecutionTimeline({
  events,
  isStreaming,
}: ExecutionTimelineProps) {
  const steps: AgentStepEvent[] = events.filter(
    (event): event is AgentStepEvent => event.type === "agent_step"
  );

  if (!steps.length && !isStreaming) {
    return null;
  }

  const statusForIndex = (index: number): StepStatus => {
    if (isStreaming && index === steps.length - 1) {
      return "in_progress";
    }
    return "done";
  };

  return (
    <section className="space-y-2 rounded-md border border-neutral-800 bg-neutral-950/40 p-3 text-xs">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
          Execution timeline
        </h2>
        <div className="flex items-center gap-3 text-[10px] text-neutral-500">
          <span className="inline-flex items-center gap-1">
            <span className="text-sky-400">{STATUS_ICON.in_progress.icon}</span>
            <span>In progress</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="text-emerald-400">{STATUS_ICON.done.icon}</span>
            <span>Done</span>
          </span>
        </div>
      </div>

      {steps.length === 0 && isStreaming ? (
        <p className="text-[11px] text-neutral-500">
          Waiting for the first agent step...
        </p>
      ) : (
        <ol className="space-y-2">
          {steps.map((step, index) => {
            const status = statusForIndex(index);
            const statusMeta = STATUS_ICON[status];
            const hasToolMessage = step.messages.some(
              (message) => message.type === "tool"
            );
            const stepLabel = hasToolMessage ? "Tool step" : "Agent step";

            return (
              <li
                key={`${step.node}-${index}`}
                className="rounded-md bg-neutral-900/60"
              >
                <details
                  className="group"
                  defaultValue={undefined}
                  open={index === steps.length - 1}
                >
                  <summary className="flex cursor-pointer items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-[11px] text-neutral-200 hover:border-neutral-700">
                    <span
                      className={
                        status === "in_progress"
                          ? "text-sky-400"
                          : "text-emerald-400"
                      }
                    >
                      {statusMeta.icon}
                    </span>
                    <span className="font-medium">
                      Step {index + 1} {stepLabel}
                    </span>
                    <span className="ml-auto text-[10px] text-neutral-500">
                      node: {step.node}
                    </span>
                  </summary>

                  <div className="space-y-1 border-t border-neutral-800 px-2 py-2 text-[11px] text-neutral-200">
                    {step.messages.map((message, messageIndex) => (
                      <div
                        key={messageIndex}
                        className="rounded-md bg-neutral-900/80 p-2"
                      >
                        <div className="mb-1 flex items-center gap-2 text-[10px] text-neutral-400">
                          <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] uppercase tracking-wide">
                            {message.type}
                          </span>
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
