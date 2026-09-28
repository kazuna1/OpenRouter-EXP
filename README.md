# AI Model Playground

A modern, ChatGPT-style interface for comparing free language models through
OpenRouter. The project uses Next.js App Router, React, TypeScript, and
Tailwind CSS.

## Getting Started

Install dependencies:

```bash
npm install
```

Copy the environment template and add your server-side OpenRouter key:

```powershell
Copy-Item .env.example .env.local
```

Then start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The API key is read only by the server-side OpenRouter client. It must never
use the `NEXT_PUBLIC_` prefix.

## Chat API

Send a `POST` request to `/api/chat`:

```json
{
  "model": "gemma",
  "message": "Explain recursion",
  "history": [
    {
      "role": "user",
      "content": "Keep the explanation concise."
    }
  ]
}
```

`history` is optional. Model IDs come from `data/models.ts`; the server rejects
unknown IDs instead of accepting arbitrary OpenRouter model identifiers.

## Free-model catalog

The browser requests `/api/models` after startup. The server fetches the
account-filtered OpenRouter catalog, caches it for 15 minutes, and returns only
text models whose IDs end in `:free` and whose published pricing fields are all
zero.

If OpenRouter's catalog is temporarily unavailable, the application keeps five
verified free models as a safe local fallback. The chat route validates every
selected ID against the same server-side catalog, so manually submitting a
paid model ID cannot bypass the UI.

## Commands

```bash
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
npm run start
```

## Deploy to Vercel

1. Import the repository into Vercel.
2. Add `OPENROUTER_API_KEY` in the project's Environment Variables for
   Preview and Production.
3. Deploy. Vercel detects the Next.js application automatically; no custom
   build or routing configuration is required.

Never prefix the key with `NEXT_PUBLIC_`. Only the route handler and
server-only OpenRouter client read it.

## Model maintenance

The live catalog normally requires no manual maintenance. `data/models.ts`
contains only the outage fallback; keep those entries on verified `:free`
variants when changing them.

## Current status

The MVP is complete: it includes the project foundation, free-model registry,
secure chat API, responsive interface, instant model switching, contextual
session history, loading feedback, model badges, friendly errors, automatic
scrolling, automated regression tests, and Vercel-ready configuration.

Phase 7 adds a live, searchable free-model catalog with strict zero-cost
filtering and a server-side dynamic allowlist.

Phase 8 moves model selection into the chat header. Switching models preserves
one continuous conversation, each assistant message keeps its original model
badge, and the selected model handles only future requests. The latest
conversation is stored in versioned browser local storage and can be removed
with the header's clear button.
