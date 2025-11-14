export type ModelId = "gpt-5" | "gemini-2.5-flash";

export interface ModelOption {
  id: ModelId;
  label: string;
  provider: "openai" | "google";
  modelName: string;
}

export const MODEL_OPTIONS: ModelOption[] = [
  {
    id: "gpt-5",
    label: "GPT-5 · OpenAI",
    provider: "openai",
    modelName: "gpt-5",
  },
  {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash · Google",
    provider: "google",
    modelName: "gemini-2.5-flash",
  },
];

export function findModelOption(id: string): ModelOption {
  for (let index = 0; index < MODEL_OPTIONS.length; index += 1) {
    const option: ModelOption = MODEL_OPTIONS[index];
    if (option.id === id) {
      return option;
    }
  }
  return MODEL_OPTIONS[0];
}
