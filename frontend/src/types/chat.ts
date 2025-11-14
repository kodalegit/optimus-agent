export type ChatMessageRole = "user" | "assistant";

export interface ChatMessage {
  id: number;
  role: ChatMessageRole;
  content: string;
}
