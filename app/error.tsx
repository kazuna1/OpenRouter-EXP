"use client";

interface ErrorPageProps {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}

export default function ErrorPage({
  unstable_retry,
}: ErrorPageProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#080a0f] px-6 text-slate-100">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-[#10131b] p-8 text-center shadow-2xl shadow-black/30">
        <div
          aria-hidden="true"
          className="mx-auto mb-5 flex size-12 items-center justify-center rounded-2xl bg-rose-400/10 text-xl text-rose-300"
        >
          !
        </div>
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          The playground hit an unexpected problem. Your API key has not
          been exposed.
        </p>
        <button
          type="button"
          onClick={unstable_retry}
          className="mt-6 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
