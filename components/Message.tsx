import type { Message as ChatMessage } from "@/types/chat";

interface MessageProps {
  message: ChatMessage;
  modelName?: string;
}

function AssistantAvatar() {
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-xl border border-violet-400/20 bg-violet-500/10 text-violet-300">
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      >
        <path
          d="M10 3.2 11.1 6a3 3 0 0 0 1.8 1.8L15.8 9l-2.9 1.2a3 3 0 0 0-1.8 1.8L10 14.8 8.9 12a3 3 0 0 0-1.8-1.8L4.2 9l2.9-1.2A3 3 0 0 0 8.9 6L10 3.2Z"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function LoadingMessage({ modelName }: { modelName: string }) {
  return (
    <article
      aria-label={`${modelName} is thinking`}
      className="mx-auto flex w-full max-w-3xl gap-3 px-4 sm:px-6"
    >
      <AssistantAvatar />
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="mb-2 text-xs font-semibold tracking-wide text-violet-300">
          {modelName}
        </p>
        <div
          role="status"
          className="flex h-7 items-center gap-1.5 text-zinc-500"
        >
          <span className="sr-only">Thinking...</span>
          <span
            aria-hidden="true"
            className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-300ms]"
          />
          <span
            aria-hidden="true"
            className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-150ms]"
          />
          <span
            aria-hidden="true"
            className="size-1.5 animate-bounce rounded-full bg-current"
          />
        </div>
      </div>
    </article>
  );
}

export default function Message({ message, modelName }: MessageProps) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <article
        aria-label="Your message"
        className="mx-auto flex w-full max-w-3xl justify-end px-4 sm:px-6"
      >
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-violet-600 px-4 py-3 text-sm leading-6 text-white shadow-lg shadow-violet-950/20 sm:max-w-[75%]">
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
      </article>
    );
  }

  return (
    <article
      aria-label={`${modelName ?? message.model ?? "Assistant"} response`}
      className="mx-auto flex w-full max-w-3xl gap-3 px-4 sm:px-6"
    >
      <AssistantAvatar />
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="mb-2 text-xs font-semibold tracking-wide text-violet-300">
          {modelName ?? message.model ?? "Assistant"}
        </p>
        <div className="text-sm leading-7 text-zinc-200">
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
      </div>
    </article>
  );
}
