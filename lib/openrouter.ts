import "server-only";

import type { ChatHistoryMessage } from "@/types/chat";

const OPENROUTER_CHAT_URL =
  "https://openrouter.ai/api/v1/chat/completions";
const REQUEST_TIMEOUT_MS = 45_000;

export type OpenRouterFailureReason =
  | "configuration"
  | "timeout"
  | "unavailable"
  | "invalid_response";

export class OpenRouterError extends Error {
  readonly reason: OpenRouterFailureReason;
  readonly status?: number;

  constructor(
    message: string,
    reason: OpenRouterFailureReason,
    status?: number,
  ) {
    super(message);
    this.name = "OpenRouterError";
    this.reason = reason;
    this.status = status;
  }
}

export interface OpenRouterChatInput {
  model: string;
  messages: readonly ChatHistoryMessage[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractTextContent(content: unknown): string | undefined {
  if (typeof content === "string" && content.trim()) {
    return content;
  }

  if (!Array.isArray(content)) {
    return undefined;
  }

  const text = content
    .map((part) => {
      if (!isRecord(part) || part.type !== "text") {
        return "";
      }

      return typeof part.text === "string" ? part.text : "";
    })
    .join("")
    .trim();

  return text || undefined;
}

function extractCompletion(payload: unknown): string | undefined {
  if (!isRecord(payload) || !Array.isArray(payload.choices)) {
    return undefined;
  }

  const firstChoice = payload.choices[0];
  if (!isRecord(firstChoice) || !isRecord(firstChoice.message)) {
    return undefined;
  }

  return extractTextContent(firstChoice.message.content);
}

function extractProviderError(payload: unknown): string | undefined {
  if (!isRecord(payload) || !isRecord(payload.error)) {
    return undefined;
  }

  return typeof payload.error.message === "string"
    ? payload.error.message
    : undefined;
}

export function getOpenRouterApiKey(): string | undefined {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();

  return apiKey || undefined;
}

function getApiKey(): string {
  const apiKey = getOpenRouterApiKey();

  if (!apiKey) {
    throw new OpenRouterError(
      "OPENROUTER_API_KEY is not configured.",
      "configuration",
    );
  }

  return apiKey;
}

export async function createOpenRouterCompletion({
  model,
  messages,
}: OpenRouterChatInput): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(OPENROUTER_CHAT_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${getApiKey()}`,
        "Content-Type": "application/json",
        "X-Title": "AI Model Playground",
      },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
      }),
      cache: "no-store",
      signal: controller.signal,
    });

    let payload: unknown;

    try {
      payload = await response.json();
    } catch {
      throw new OpenRouterError(
        "OpenRouter returned an unreadable response.",
        "invalid_response",
        response.status,
      );
    }

    if (!response.ok) {
      throw new OpenRouterError(
        extractProviderError(payload) ?? "OpenRouter request failed.",
        "unavailable",
        response.status,
      );
    }

    const content = extractCompletion(payload);

    if (!content) {
      throw new OpenRouterError(
        "OpenRouter returned no assistant content.",
        "invalid_response",
        response.status,
      );
    }

    return content;
  } catch (error: unknown) {
    if (error instanceof OpenRouterError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new OpenRouterError("OpenRouter request timed out.", "timeout");
    }

    throw new OpenRouterError(
      "OpenRouter could not be reached.",
      "unavailable",
    );
  } finally {
    clearTimeout(timeout);
  }
}
