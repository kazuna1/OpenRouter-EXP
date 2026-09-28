"use client";

import { useEffect, useRef } from "react";
import type { FormEvent, KeyboardEvent } from "react";

interface InputProps {
  value: string;
  placeholder?: string;
  loading?: boolean;
  disabled?: boolean;
  onValueChange?: (value: string) => void;
  onSubmit?: () => void;
}

export default function Input({
  value,
  placeholder = "Ask anything...",
  loading = false,
  disabled = false,
  onValueChange,
  onSubmit,
}: InputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canSubmit =
    Boolean(onSubmit) && !disabled && !loading && Boolean(value.trim());

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > 160 ? "auto" : "hidden";
  }, [value]);

  function submit() {
    if (canSubmit) {
      onSubmit?.();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && canSubmit) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto w-full max-w-3xl">
      <div className="flex items-end gap-2 rounded-2xl border border-border bg-panel-raised p-2 shadow-2xl shadow-black/25 transition focus-within:border-violet-400/35 focus-within:ring-4 focus-within:ring-violet-500/5">
        <label htmlFor="chat-message" className="sr-only">
          Message
        </label>
        <textarea
          ref={textareaRef}
          id="chat-message"
          name="message"
          rows={1}
          maxLength={20_000}
          value={value}
          disabled={disabled}
          readOnly={!onValueChange}
          aria-describedby="chat-input-hint"
          placeholder={placeholder}
          onChange={(event) => onValueChange?.(event.target.value)}
          onKeyDown={handleKeyDown}
          className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-3 py-3 text-sm leading-5 text-zinc-100 outline-none placeholder:text-zinc-600 disabled:cursor-not-allowed disabled:opacity-70"
        />
        <button
          type="submit"
          disabled={!canSubmit}
          aria-label={loading ? "Thinking" : "Send message"}
          className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:bg-violet-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 disabled:cursor-not-allowed disabled:bg-white/[0.06] disabled:text-zinc-600 disabled:shadow-none"
        >
          {loading ? (
            <>
              <span className="sr-only">Thinking</span>
              <span aria-hidden="true" className="flex gap-1">
                <span className="size-1 animate-pulse rounded-full bg-current" />
                <span className="size-1 animate-pulse rounded-full bg-current [animation-delay:150ms]" />
                <span className="size-1 animate-pulse rounded-full bg-current [animation-delay:300ms]" />
              </span>
            </>
          ) : (
            <>
              <span className="hidden sm:inline">Send</span>
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path
                  d="m5 10 5-5 5 5M10 5v10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </>
          )}
        </button>
      </div>
      <p
        id="chat-input-hint"
        className="mt-2 text-center text-[0.6875rem] text-zinc-600"
      >
        Enter to send <span aria-hidden="true">&middot;</span> Shift + Enter for
        a new line
      </p>
    </form>
  );
}
