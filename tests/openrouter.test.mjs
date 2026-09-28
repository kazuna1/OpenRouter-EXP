import assert from "node:assert/strict";
import test from "node:test";

import {
  createOpenRouterCompletion,
  OpenRouterError,
} from "../lib/openrouter.ts";

const originalFetch = globalThis.fetch;
const originalApiKey = process.env.OPENROUTER_API_KEY;

test.after(() => {
  globalThis.fetch = originalFetch;

  if (originalApiKey === undefined) {
    delete process.env.OPENROUTER_API_KEY;
  } else {
    process.env.OPENROUTER_API_KEY = originalApiKey;
  }
});

test("rejects requests when the server key is missing", async () => {
  delete process.env.OPENROUTER_API_KEY;
  globalThis.fetch = async () => {
    throw new Error("fetch must not run");
  };

  await assert.rejects(
    createOpenRouterCompletion({
      model: "provider/model:free",
      messages: [{ role: "user", content: "Hello" }],
    }),
    (error) =>
      error instanceof OpenRouterError &&
      error.reason === "configuration",
  );
});

test("sends a server-side request and extracts string content", async () => {
  process.env.OPENROUTER_API_KEY = "test-secret";
  let capturedUrl;
  let capturedOptions;

  globalThis.fetch = async (url, options) => {
    capturedUrl = url;
    capturedOptions = options;
    return Response.json({
      choices: [{ message: { content: "Hello back" } }],
    });
  };

  const content = await createOpenRouterCompletion({
    model: "provider/model:free",
    messages: [{ role: "user", content: "Hello" }],
  });

  assert.equal(content, "Hello back");
  assert.equal(
    capturedUrl,
    "https://openrouter.ai/api/v1/chat/completions",
  );
  assert.equal(capturedOptions.method, "POST");
  assert.equal(
    capturedOptions.headers.Authorization,
    "Bearer test-secret",
  );
  assert.deepEqual(JSON.parse(capturedOptions.body), {
    model: "provider/model:free",
    messages: [{ role: "user", content: "Hello" }],
    stream: false,
  });
});

test("combines text content blocks", async () => {
  process.env.OPENROUTER_API_KEY = "test-secret";
  globalThis.fetch = async () =>
    Response.json({
      choices: [
        {
          message: {
            content: [
              { type: "text", text: "Hello " },
              { type: "image", image: "ignored" },
              { type: "text", text: "world" },
            ],
          },
        },
      ],
    });

  assert.equal(
    await createOpenRouterCompletion({
      model: "provider/model:free",
      messages: [{ role: "user", content: "Hello" }],
    }),
    "Hello world",
  );
});

test("maps provider and response failures to safe error reasons", async (t) => {
  process.env.OPENROUTER_API_KEY = "test-secret";

  await t.test("rate limit", async () => {
    globalThis.fetch = async () =>
      Response.json(
        { error: { message: "Rate limited" } },
        { status: 429 },
      );

    await assert.rejects(
      createOpenRouterCompletion({
        model: "provider/model:free",
        messages: [],
      }),
      (error) =>
        error instanceof OpenRouterError &&
        error.reason === "unavailable" &&
        error.status === 429,
    );
  });

  await t.test("invalid JSON", async () => {
    globalThis.fetch = async () =>
      new Response("not json", { status: 200 });

    await assert.rejects(
      createOpenRouterCompletion({
        model: "provider/model:free",
        messages: [],
      }),
      (error) =>
        error instanceof OpenRouterError &&
        error.reason === "invalid_response",
    );
  });

  await t.test("missing content", async () => {
    globalThis.fetch = async () => Response.json({ choices: [] });

    await assert.rejects(
      createOpenRouterCompletion({
        model: "provider/model:free",
        messages: [],
      }),
      (error) =>
        error instanceof OpenRouterError &&
        error.reason === "invalid_response",
    );
  });

  await t.test("network failure", async () => {
    globalThis.fetch = async () => {
      throw new TypeError("network unavailable");
    };

    await assert.rejects(
      createOpenRouterCompletion({
        model: "provider/model:free",
        messages: [],
      }),
      (error) =>
        error instanceof OpenRouterError &&
        error.reason === "unavailable",
    );
  });
});
