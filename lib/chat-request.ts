import type {
  ChatHistoryMessage,
  ChatRequest,
  MessageRole,
} from "@/types/chat";

const MAX_MESSAGE_LENGTH = 20_000;
const MAX_HISTORY_MESSAGES = 50;
const MAX_HISTORY_CHARACTERS = 100_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isMessageRole(value: unknown): value is MessageRole {
  return value === "user" || value === "assistant";
}

function parseHistory(value: unknown): ChatHistoryMessage[] | undefined {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value) || value.length > MAX_HISTORY_MESSAGES) {
    return undefined;
  }

  const history: ChatHistoryMessage[] = [];
  let characterCount = 0;

  for (const item of value) {
    if (
      !isRecord(item) ||
      !isMessageRole(item.role) ||
      typeof item.content !== "string" ||
      !item.content.trim() ||
      item.content.length > MAX_MESSAGE_LENGTH
    ) {
      return undefined;
    }

    characterCount += item.content.length;

    if (characterCount > MAX_HISTORY_CHARACTERS) {
      return undefined;
    }

    history.push({
      role: item.role,
      content: item.content.trim(),
    });
  }

  return history;
}

export function parseChatRequest(
  payload: unknown,
): ChatRequest | undefined {
  if (
    !isRecord(payload) ||
    typeof payload.model !== "string" ||
    typeof payload.message !== "string"
  ) {
    return undefined;
  }

  const model = payload.model.trim();
  const message = payload.message.trim();
  const history = parseHistory(payload.history);

  if (
    !model ||
    !message ||
    message.length > MAX_MESSAGE_LENGTH ||
    history === undefined
  ) {
    return undefined;
  }

  return {
    model,
    message,
    history,
  };
}
