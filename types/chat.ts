export type MessageRole = "user" | "assistant";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  model?: string;
  createdAt: Date;
}

export interface ChatHistoryMessage {
  role: MessageRole;
  content: string;
}

export interface ChatRequest {
  model: string;
  message: string;
  history?: ChatHistoryMessage[];
}

export interface ChatResponse {
  content: string;
  model: string;
}

export type ChatErrorCode =
  | "INVALID_REQUEST"
  | "MODEL_NOT_FOUND"
  | "MODEL_UNAVAILABLE"
  | "OPENROUTER_ERROR"
  | "SERVER_CONFIGURATION_ERROR";

export interface ChatErrorResponse {
  error: {
    code: ChatErrorCode;
    message: string;
  };
}
