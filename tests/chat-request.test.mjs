import assert from "node:assert/strict";
import test from "node:test";

import { parseChatRequest } from "../lib/chat-request.ts";

test("parses and trims a valid chat request", () => {
  assert.deepEqual(
    parseChatRequest({
      model: "  gemma ",
      message: " Explain recursion. ",
      history: [
        { role: "user", content: " Keep it concise. " },
        { role: "assistant", content: "Sure." },
      ],
    }),
    {
      model: "gemma",
      message: "Explain recursion.",
      history: [
        { role: "user", content: "Keep it concise." },
        { role: "assistant", content: "Sure." },
      ],
    },
  );
});

test("defaults omitted history to an empty list", () => {
  assert.deepEqual(
    parseChatRequest({ model: "gemma", message: "Hello" }),
    {
      model: "gemma",
      message: "Hello",
      history: [],
    },
  );
});

test("rejects malformed and oversized requests", () => {
  const invalidPayloads = [
    null,
    {},
    { model: "gemma", message: "   " },
    { model: "   ", message: "Hello" },
    { model: "gemma", message: "x".repeat(20_001) },
    { model: "gemma", message: "Hello", history: "invalid" },
    {
      model: "gemma",
      message: "Hello",
      history: [{ role: "system", content: "No" }],
    },
    {
      model: "gemma",
      message: "Hello",
      history: [{ role: "user", content: " " }],
    },
    {
      model: "gemma",
      message: "Hello",
      history: Array.from({ length: 51 }, () => ({
        role: "user",
        content: "x",
      })),
    },
    {
      model: "gemma",
      message: "Hello",
      history: Array.from({ length: 6 }, () => ({
        role: "user",
        content: "x".repeat(20_000),
      })),
    },
  ];

  for (const payload of invalidPayloads) {
    assert.equal(parseChatRequest(payload), undefined);
  }
});
