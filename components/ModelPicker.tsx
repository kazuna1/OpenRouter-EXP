"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { FreeModel, ModelCatalogSource } from "@/types/models";

interface ModelPickerProps {
  models: readonly FreeModel[];
  selectedModelId: string;
  catalogLoading: boolean;
  catalogSource: ModelCatalogSource;
  onModelSelect: (modelId: string) => void;
}

function formatContextLength(contextLength: number | null): string {
  if (contextLength === null) {
    return "Context unknown";
  }

  if (contextLength >= 1_000_000) {
    const millions = contextLength / 1_000_000;
    return `${Number.isInteger(millions) ? millions : millions.toFixed(1)}M context`;
  }

  return `${Math.round(contextLength / 1_000)}K context`;
}

export default function ModelPicker({
  models,
  selectedModelId,
  catalogLoading,
  catalogSource,
  onModelSelect,
}: ModelPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);
  const selectedModel = models.find(
    (model) => model.id === selectedModelId,
  );
  const normalizedQuery = query.trim().toLowerCase();
  const filteredModels = useMemo(
    () =>
      normalizedQuery
        ? models.filter((model) =>
            [model.name, model.provider, model.id].some((value) =>
              value.toLowerCase().includes(normalizedQuery),
            ),
          )
        : models,
    [models, normalizedQuery],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !pickerRef.current?.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function selectModel(modelId: string) {
    onModelSelect(modelId);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={pickerRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="model-picker-list"
        onClick={() => setOpen((current) => !current)}
        className="flex h-10 max-w-[11rem] items-center gap-2 rounded-xl border border-border bg-white/[0.025] px-3 text-left transition hover:border-violet-400/25 hover:bg-violet-500/[0.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 sm:max-w-[18rem]"
      >
        <span
          aria-hidden="true"
          className="size-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.08)]"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold text-zinc-200 sm:text-sm">
            {selectedModel?.name ?? "Choose a model"}
          </span>
          <span className="hidden truncate text-[0.625rem] text-zinc-600 sm:block">
            {selectedModel?.provider.toUpperCase() ?? "OPENROUTER"} · FREE
          </span>
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className={[
            "size-3.5 shrink-0 text-zinc-500 transition",
            open ? "rotate-180" : "",
          ].join(" ")}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
        >
          <path d="m4 6 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open ? (
        <div className="absolute top-full right-0 z-50 mt-2 flex max-h-[min(32rem,calc(100svh-5rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111116]/98 shadow-2xl shadow-black/50 backdrop-blur-2xl">
          <div className="border-b border-border p-3">
            <div className="flex items-center justify-between px-1 pb-2">
              <p className="text-xs font-semibold text-zinc-200">
                Choose a free model
              </p>
              <span className="text-[0.6875rem] text-zinc-600">
                {filteredModels.length}/{models.length}
              </span>
            </div>
            <label className="relative block">
              <span className="sr-only">Search free models</span>
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-600"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
              >
                <circle cx="8.5" cy="8.5" r="4.75" />
                <path d="m12 12 3.5 3.5" strokeLinecap="round" />
              </svg>
              <input
                autoFocus
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search model or provider"
                className="h-10 w-full rounded-xl border border-border bg-black/20 pr-3 pl-9 text-xs text-zinc-200 outline-none transition placeholder:text-zinc-600 focus:border-violet-400/35 focus:ring-2 focus:ring-violet-500/10"
              />
            </label>
          </div>

          <div
            id="model-picker-list"
            role="listbox"
            aria-label="Free AI models"
            className="scrollbar-subtle min-h-0 flex-1 overflow-y-auto p-2"
          >
            {filteredModels.length > 0 ? (
              filteredModels.map((model) => {
                const selected = model.id === selectedModelId;

                return (
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    key={model.id}
                    onClick={() => selectModel(model.id)}
                    className={[
                      "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition",
                      selected
                        ? "border-violet-400/25 bg-violet-500/10"
                        : "border-transparent hover:border-border hover:bg-white/[0.035]",
                    ].join(" ")}
                  >
                    <span
                      aria-hidden="true"
                      className={[
                        "size-2 shrink-0 rounded-full ring-4",
                        selected
                          ? "bg-violet-400 ring-violet-400/10"
                          : "bg-zinc-700 ring-transparent",
                      ].join(" ")}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium text-zinc-200">
                        {model.name}
                      </span>
                      <span className="mt-0.5 block truncate text-[0.6875rem] text-zinc-600">
                        {model.provider.toUpperCase()} ·{" "}
                        {formatContextLength(model.contextLength)}
                      </span>
                    </span>
                    {selected ? (
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 20 20"
                        className="size-4 shrink-0 text-violet-300"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          d="m5 10 3 3 7-7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : null}
                  </button>
                );
              })
            ) : (
              <p className="px-3 py-8 text-center text-xs text-zinc-600">
                No free models match “{query.trim()}”.
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 border-t border-border px-4 py-3 text-[0.6875rem] text-zinc-600">
            <span
              aria-hidden="true"
              className={[
                "size-1.5 rounded-full",
                catalogLoading
                  ? "animate-pulse bg-amber-400"
                  : catalogSource === "openrouter"
                    ? "bg-emerald-400"
                    : "bg-amber-400",
              ].join(" ")}
            />
            {catalogLoading
              ? "Refreshing OpenRouter catalog"
              : catalogSource === "openrouter"
                ? `${models.length} live zero-cost models`
                : "Using safe fallback models"}
          </div>
        </div>
      ) : null}
    </div>
  );
}
