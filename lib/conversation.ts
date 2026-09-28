import type {
  ChatHistoryMessage,
  Message as ChatMessage,
  MessageRole,
} from "@/types/chat";

export const CONVERSATION_STORAGE_KEY =
  "ai-model-playground:conversation:v1";

const STORAGE_VERSION = 1;
const MAX_STORED_MESSAGES = 100;
const MAX_STORED_CHARACTERS = 500_000;
const MAX_SERIALIZED_LENGTH = 1_000_000;
const MAX_MESSAGE_LENGTH = 20_000;
const MAX_MESSAGE_ID_LENGTH = 120;
const MAX_MODEL_ID_LENGTH = 240;
const MAX_HISTORY_MESSAGES = 50;
const MAX_HISTORY_CHARACTERS = 90_000;

export interface RestoredConversation {
  readonly selectedModelId: string;
  readonly messages: ChatMessage[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isMessageRole(value: unknown): value is MessageRole {
  return value === "user" || value === "assistant";
}

function isFreeModelId(value: string): boolean {
  return (
    value.length <= MAX_MODEL_ID_LENGTH &&
    /^[^/\s]+\/[^\s]+:free$/.test(value)
  );
}

function parseMessage(value: unknown): ChatMessage | undefined {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    !value.id ||
    value.id.length > MAX_MESSAGE_ID_LENGTH ||
    !isMessageRole(value.role) ||
    typeof value.content !== "string" ||
    !value.content.trim() ||
    value.content.length > MAX_MESSAGE_LENGTH ||
    typeof value.createdAt !== "string"
  ) {
    return undefined;
  }

  const createdAt = new Date(value.createdAt);

  if (!Number.isFinite(createdAt.getTime())) {
    return undefined;
  }

  const model =
    typeof value.model === "string" && isFreeModelId(value.model)
      ? value.model
      : undefined;

  return {
    id: value.id,
    role: value.role,
    content: value.content,
    ...(model ? { model } : {}),
    createdAt,
  };
}

export function parseStoredConversation(
  serialized: string,
): RestoredConversation | undefined {
  if (!serialized || serialized.length > MAX_SERIALIZED_LENGTH) {
    return undefined;
  }

  let payload: unknown;

  try {
    payload = JSON.parse(serialized);
  } catch {
    return undefined;
  }

  if (
    !isRecord(payload) ||
    payload.version !== STORAGE_VERSION ||
    typeof payload.selectedModelId !== "string" ||
    !isFreeModelId(payload.selectedModelId) ||
    !Array.isArray(payload.messages)
  ) {
    return undefined;
  }

  const messages: ChatMessage[] = [];
  let characterCount = 0;
  const candidates = payload.messages.slice(-MAX_STORED_MESSAGES);

  for (let index = candidates.length - 1; index >= 0; index -= 1) {
    const message = parseMessage(candidates[index]);

    if (!message) {
      continue;
    }

    if (characterCount + message.content.length > MAX_STORED_CHARACTERS) {
      break;
    }

    characterCount += message.content.length;
    messages.unshift(message);
  }

  return {
    selectedModelId: payload.selectedModelId,
    messages,
  };
}

export function serializeConversation(
  selectedModelId: string,
  messages: readonly ChatMessage[],
): string {
  const storedMessages: Array<{
    id: string;
    role: MessageRole;
    content: string;
    model?: string;
    createdAt: string;
  }> = [];
  let characterCount = 0;

  for (
    let index = messages.length - 1;
    index >= 0 && storedMessages.length < MAX_STORED_MESSAGES;
    index -= 1
  ) {
    const message = messages[index];

    if (
      !message ||
      characterCount + message.content.length > MAX_STORED_CHARACTERS
    ) {
      break;
    }

    characterCount += message.content.length;
    storedMessages.unshift({
      id: message.id,
      role: message.role,
      content: message.content,
      ...(message.model ? { model: message.model } : {}),
      createdAt: message.createdAt.toISOString(),
    });
  }

  return JSON.stringify({
    version: STORAGE_VERSION,
    selectedModelId,
    messages: storedMessages,
  });
}

export function createRequestHistory(
  messages: readonly ChatMessage[],
): ChatHistoryMessage[] {
  const history: ChatHistoryMessage[] = [];
  let characterCount = 0;

  for (
    let index = messages.length - 1;
    index >= 0 && history.length < MAX_HISTORY_MESSAGES;
    index -= 1
  ) {
    const message = messages[index];

    if (
      !message ||
      characterCount + message.content.length > MAX_HISTORY_CHARACTERS
    ) {
      break;
    }

    characterCount += message.content.length;
    history.unshift({
      role: message.role,
      content: message.content,
    });
  }

  return history;
}
