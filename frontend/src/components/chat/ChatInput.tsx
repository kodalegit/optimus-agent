"use client";

import type { FormEvent, KeyboardEvent } from "react";
import { ArrowUp, Sparkles } from "lucide-react";
import { MODEL_OPTIONS, type ModelOption } from "@/lib/models";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  disabled: boolean;
  selectedModelId: string;
  onModelChange: (id: string) => void;
  isStreaming: boolean;
  onExampleClick?: () => void;
}

export function ChatInput({
  value,
  onChange,
  onSubmit,
  disabled,
  selectedModelId,
  onModelChange,
  isStreaming,
  onExampleClick,
}: ChatInputProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    onSubmit(event);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!isSendDisabled) {
        event.currentTarget.form?.requestSubmit();
      }
    }
  };

  let selectedModel: ModelOption = MODEL_OPTIONS[0];
  for (let index = 0; index < MODEL_OPTIONS.length; index += 1) {
    const option: ModelOption = MODEL_OPTIONS[index];
    if (option.id === selectedModelId) {
      selectedModel = option;
      break;
    }
  }

  const isSendDisabled = disabled || !value.trim();

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative flex w-full flex-col overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/70">
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask OpsAgent about your operations, tools, or documents..."
          className="w-full min-h-[60px] max-h-[160px] resize-none border-none bg-transparent px-4 py-3 text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none focus:ring-0"
        />
        <div className="flex items-center justify-between border-t border-slate-800/80 bg-slate-950/90 px-3 py-2 text-[11px]">
          <div className="flex items-center gap-3">
            {onExampleClick && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900/70 px-2.5 py-1 text-[11px] font-medium text-slate-100 hover:bg-emerald-500/80 cursor-pointer"
                onClick={onExampleClick}
              >
                <Sparkles className="h-3 w-3 text-sky-400" />
                <span>Example query</span>
              </Button>
            )}
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Model</span>
              <Select value={selectedModelId} onValueChange={onModelChange}>
                <SelectTrigger className="h-7 rounded-full border-slate-700 bg-slate-900/80 px-3 py-1 text-[11px] text-slate-100">
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent className="bg-slate-950 text-slate-50">
                  {MODEL_OPTIONS.map((option: ModelOption) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="hidden text-[11px] text-slate-500 sm:inline">
                {selectedModel.label}
              </span>
            </div>
          </div>

          <Button
            type="submit"
            size="icon-sm"
            disabled={isSendDisabled}
            aria-label={isStreaming ? "Streaming response" : "Send message"}
            className="h-8 w-8 rounded-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            {isStreaming ? (
              <span className="h-2 w-2 rounded-full bg-primary-foreground" />
            ) : (
              <ArrowUp className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
