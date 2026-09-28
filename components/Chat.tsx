"use client";

import { useEffect, useRef, useState } from "react";

import Input from "@/components/Input";
import Message, { LoadingMessage } from "@/components/Message";
import ModelPicker from "@/components/ModelPicker";
import {
  CONVERSATION_STORAGE_KEY,
  createRequestHistory,
  parseStoredConversation,
  serializeConversation,
} from "@/lib/conversation";
import type {
  ChatResponse,
  Message as ChatMessage,
} from "@/types/chat";
import type {
  FreeModel,
  ModelCatalogSource,
  ModelsResponse,
} from "@/types/models";

interface ChatProps {
  initialModels: readonly FreeModel[];
  initialModelId: string;
}

const DEFAULT_ERROR_MESSAGE =
  "Model unavailable. Please try another model.";

const promptIdeas = [
  "Explain a difficult idea simply",
  "Help me brainstorm a project",
  "Review a small piece of code",
] as const;

class ChatRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChatRequestError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isChatResponse(payload: unknown): payload is ChatResponse {
  return (
    isRecord(payload) &&
    typeof payload.content === "string" &&
    Boolean(payload.content.trim()) &&
    typeof payload.model === "string" &&
    Boolean(payload.model.trim())
  );
}

function isFreeModel(payload: unknown): payload is FreeModel {
  return (
    isRecord(payload) &&
    typeof payload.id === "string" &&
    /^[^/\s]+\/[^\s]+:free$/.test(payload.id) &&
    typeof payload.name === "string" &&
    Boolean(payload.name.trim()) &&
    typeof payload.provider === "string" &&
    Boolean(payload.provider.trim()) &&
    (payload.contextLength === null ||
      (typeof payload.contextLength === "number" &&
        Number.isSafeInteger(payload.contextLength) &&
        payload.contextLength > 0))
  );
}

function isModelsResponse(payload: unknown): payload is ModelsResponse {
  return (
    isRecord(payload) &&
    Array.isArray(payload.models) &&
    payload.models.length > 0 &&
    payload.models.every(isFreeModel) &&
    (payload.source === "openrouter" || payload.source === "fallback")
  );
}

function getApiErrorMessage(payload: unknown): string {
  if (
    isRecord(payload) &&
    isRecord(payload.error) &&
    typeof payload.error.message === "string" &&
    payload.error.message.trim()
  ) {
    return payload.error.message.trim();
  }

  return DEFAULT_ERROR_MESSAGE;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

export default function Chat({
  initialModels,
  initialModelId,
}: ChatProps) {
  const [models, setModels] = useState<FreeModel[]>(() => [
    ...initialModels,
  ]);
  const [selectedModelId, setSelectedModelId] = useState(() =>
    initialModels.some((model) => model.id === initialModelId)
      ? initialModelId
      : (initialModels[0]?.id ?? ""),
  );
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogSource, setCatalogSource] =
    useState<ModelCatalogSource>("fallback");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [persistenceReady, setPersistenceReady] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingModelId, setPendingModelId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedModel = models.find(
    (model) => model.id === selectedModelId,
  );
  const pendingModelName =
    models.find((model) => model.id === pendingModelId)?.name ?? "Assistant";

  useEffect(() => {
    const restoreTask = window.setTimeout(() => {
      try {
        const serialized = window.localStorage.getItem(
          CONVERSATION_STORAGE_KEY,
        );
        const restored = serialized
          ? parseStoredConversation(serialized)
          : undefined;

        if (restored) {
          setMessages(restored.messages);
          setSelectedModelId(restored.selectedModelId);
        }
      } catch {
        // Storage can be unavailable in restricted browser contexts.
      } finally {
        setPersistenceReady(true);
      }
    }, 0);

    return () => window.clearTimeout(restoreTask);
  }, []);

  useEffect(() => {
    if (!persistenceReady) {
      return;
    }

    try {
      window.localStorage.setItem(
        CONVERSATION_STORAGE_KEY,
        serializeConversation(selectedModelId, messages),
      );
    } catch {
      // The in-memory conversation continues if storage is unavailable.
    }
  }, [messages, persistenceReady, selectedModelId]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadModels() {
      try {
        const response = await fetch("/api/models", {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = await readJson(response);

        if (!response.ok || !isModelsResponse(payload) || !active) {
          return;
        }

        const refreshedModels = [...payload.models];
        setModels(refreshedModels);
        setCatalogSource(payload.source);
        setSelectedModelId((currentModelId) =>
          refreshedModels.some((model) => model.id === currentModelId)
            ? currentModelId
            : (refreshedModels[0]?.id ?? ""),
        );
      } catch {
        // The safe server-rendered fallback remains available.
      } finally {
        if (active) {
          setCatalogLoading(false);
        }
      }
    }

    void loadModels();

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    messagesEndRef.current?.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "end",
    });
  }, [error, loading, messages]);

  function getModelName(modelId?: string): string | undefined {
    if (!modelId) {
      return undefined;
    }

    const modelName = models.find((model) => model.id === modelId)?.name;

    if (modelName) {
      return modelName;
    }

    return (
      modelId
        .split("/")
        .at(-1)
        ?.replace(/:free$/, "")
        .replaceAll("-", " ") ?? modelId
    );
  }

  function handleModelSelect(modelId: string) {
    if (!models.some((model) => model.id === modelId)) {
      return;
    }

    setSelectedModelId(modelId);
    setError(null);
  }

  function handleSuggestionSelect(suggestion: string) {
    setInputValue(suggestion);
    setError(null);
  }

  function handleClearConversation() {
    if (
      loading ||
      messages.length === 0 ||
      !window.confirm("Clear this conversation? This cannot be undone.")
    ) {
      return;
    }

    try {
      window.localStorage.removeItem(CONVERSATION_STORAGE_KEY);
    } catch {
      // State is still cleared when browser storage is unavailable.
    }

    setMessages([]);
    setInputValue("");
    setError(null);
  }

  async function handleSend() {
    const prompt = inputValue.trim();
    const requestModel = models.find(
      (model) => model.id === selectedModelId,
    );

    if (!prompt || loading || !requestModel) {
      return;
    }

    const history = createRequestHistory(messages);
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: prompt,
      createdAt: new Date(),
    };

    setInputValue("");
    setError(null);
    setLoading(true);
    setPendingModelId(requestModel.id);
    setMessages((currentMessages) => [...currentMessages, userMessage]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: requestModel.id,
          message: prompt,
          history,
        }),
      });
      const payload = await readJson(response);

      if (!response.ok) {
        throw new ChatRequestError(getApiErrorMessage(payload));
      }

      if (!isChatResponse(payload)) {
        throw new ChatRequestError(DEFAULT_ERROR_MESSAGE);
      }

      const responseModelId = models.some(
        (model) => model.id === payload.model,
      )
        ? payload.model
        : requestModel.id;
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: payload.content,
        model: responseModelId,
        createdAt: new Date(),
      };

      setMessages((currentMessages) => [
        ...currentMessages,
        assistantMessage,
      ]);
    } catch (requestError: unknown) {
      setError(
        requestError instanceof ChatRequestError
          ? requestError.message
          : DEFAULT_ERROR_MESSAGE,
      );
    } finally {
      setLoading(false);
      setPendingModelId(null);
    }
  }

  const hasConversation = messages.length > 0 || loading || Boolean(error);

  return (
    <main className="relative h-svh overflow-hidden bg-background text-foreground">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_68%_8%,rgba(124,58,237,0.11),transparent_30%)]"
      />

      <div className="relative flex h-svh">
        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-background/70 px-4 backdrop-blur-xl sm:px-6 md:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-950/40">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="size-4.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path
                    d="M12 3.75 13.55 8a3.9 3.9 0 0 0 2.33 2.33L20.25 12l-4.37 1.67A3.9 3.9 0 0 0 13.55 16L12 20.25 10.45 16a3.9 3.9 0 0 0-2.33-2.33L3.75 12l4.37-1.67A3.9 3.9 0 0 0 10.45 8L12 3.75Z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <div className="hidden min-w-0 sm:block">
                <p className="truncate text-sm font-semibold text-zinc-100">
                  AI Model Playground
                </p>
                <p className="mt-0.5 truncate text-[0.6875rem] text-zinc-600">
                  One persistent conversation
                </p>
              </div>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <ModelPicker
                models={models}
                selectedModelId={selectedModelId}
                catalogLoading={catalogLoading}
                catalogSource={catalogSource}
                onModelSelect={handleModelSelect}
              />
              <button
                type="button"
                aria-label="Clear conversation"
                title="Clear conversation"
                disabled={loading || messages.length === 0}
                onClick={handleClearConversation}
                className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-white/[0.025] text-zinc-500 transition hover:border-red-400/20 hover:bg-red-500/[0.06] hover:text-red-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300 disabled:cursor-not-allowed disabled:opacity-35"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  className="size-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                >
                  <path d="M4.5 6h11M8 3.75h4M6.25 6l.55 9.25h6.4L13.75 6" />
                  <path d="M8.5 8.5v4.25m3-4.25v4.25" strokeLinecap="round" />
                </svg>
              </button>
              <span
                aria-live="polite"
                className="hidden items-center gap-2 rounded-full border border-border bg-white/[0.025] px-3 py-1 text-[0.6875rem] font-medium text-zinc-500 lg:flex"
              >
                <span
                  aria-hidden="true"
                  className={[
                    "size-1.5 rounded-full",
                    loading
                      ? "animate-pulse bg-amber-400"
                      : "bg-emerald-400",
                  ].join(" ")}
                />
                {loading ? "Thinking" : "Ready"}
              </span>
            </div>
          </header>

          <div
            role="log"
            aria-live="polite"
            aria-busy={loading}
            aria-relevant="additions"
            className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto"
          >
            {hasConversation ? (
              <div className="space-y-8 py-8">
                {messages.map((message) => (
                  <Message
                    key={message.id}
                    message={message}
                    modelName={getModelName(message.model)}
                  />
                ))}

                {loading ? (
                  <LoadingMessage modelName={pendingModelName} />
                ) : null}

                {error ? (
                  <div
                    role="alert"
                    className="mx-auto flex w-[calc(100%-2rem)] max-w-3xl items-start gap-3 rounded-2xl border border-red-400/15 bg-red-500/[0.07] px-4 py-3 text-sm text-red-200 sm:w-[calc(100%-3rem)]"
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 20 20"
                      className="mt-0.5 size-4 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <circle cx="10" cy="10" r="7" />
                      <path
                        d="M10 6.5v4M10 13.5h.01"
                        strokeLinecap="round"
                      />
                    </svg>
                    <p className="flex-1 leading-5">{error}</p>
                    <button
                      type="button"
                      aria-label="Dismiss error"
                      onClick={() => setError(null)}
                      className="rounded-md p-0.5 text-red-300/60 transition hover:bg-red-400/10 hover:text-red-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-300"
                    >
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 16 16"
                        className="size-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path
                          d="m4 4 8 8m0-8-8 8"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  </div>
                ) : null}

                <div ref={messagesEndRef} aria-hidden="true" className="h-px" />
              </div>
            ) : (
              <div className="flex min-h-full items-center justify-center px-5 py-10">
                <div className="w-full max-w-2xl text-center">
                  <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-violet-400/20 bg-violet-500/10 text-violet-300 shadow-lg shadow-violet-950/20">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="size-6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    >
                      <path
                        d="M12 3.75 13.55 8a3.9 3.9 0 0 0 2.33 2.33L20.25 12l-4.37 1.67A3.9 3.9 0 0 0 13.55 16L12 20.25 10.45 16a3.9 3.9 0 0 0-2.33-2.33L3.75 12l4.37-1.67A3.9 3.9 0 0 0 10.45 8L12 3.75Z"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <h1 className="mt-5 text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">
                    What would you like to explore?
                  </h1>
                  <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-500">
                    Ask {selectedModel?.name ?? "a model"} a question and
                    compare its answer with another free model.
                  </p>

                  <div className="mx-auto mt-7 grid max-w-xl gap-2 sm:grid-cols-3">
                    {promptIdeas.map((idea) => (
                      <button
                        type="button"
                        key={idea}
                        onClick={() => handleSuggestionSelect(idea)}
                        className="rounded-xl border border-border bg-white/[0.02] px-3 py-3 text-left text-xs leading-5 text-zinc-500 transition hover:border-violet-400/20 hover:bg-violet-500/[0.06] hover:text-zinc-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
                      >
                        {idea}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <footer className="shrink-0 border-t border-border bg-background/80 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:px-6 md:px-8 md:pt-4">
            <Input
              value={inputValue}
              loading={loading}
              disabled={!selectedModel}
              placeholder={`Message ${selectedModel?.name ?? "a model"}...`}
              onValueChange={setInputValue}
              onSubmit={handleSend}
            />
          </footer>
        </section>
      </div>
    </main>
  );
}
