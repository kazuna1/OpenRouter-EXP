import assert from "node:assert/strict";
import test from "node:test";

import {
  createRequestHistory,
  parseStoredConversation,
  serializeConversation,
} from "../lib/conversation.ts";

function message(index, overrides = {}) {
  return {
    id: `message-${index}`,
    role: index % 2 === 0 ? "user" : "assistant",
    content: `Message ${index}`,
    ...(index % 2 === 0
      ? {}
      : { model: "provider/useful-model:free" }),
    createdAt: new Date(`2026-01-01T00:00:${String(index % 60).padStart(2, "0")}Z`),
    ...overrides,
  };
}

test("conversation storage round-trips messages, dates, and model selection", () => {
  const messages = [message(0), message(1)];
  const serialized = serializeConversation(
    "provider/useful-model:free",
    messages,
  );
  const restored = parseStoredConversation(serialized);

  assert.equal(restored?.selectedModelId, "provider/useful-model:free");
  assert.deepEqual(restored?.messages, messages);
  assert.ok(restored?.messages[0]?.createdAt instanceof Date);
});

test("rejects malformed, outdated, and paid-model storage payloads", () => {
  assert.equal(parseStoredConversation("not json"), undefined);
  assert.equal(
    parseStoredConversation(
      JSON.stringify({
        version: 2,
        selectedModelId: "provider/useful-model:free",
        messages: [],
      }),
    ),
    undefined,
  );
  assert.equal(
    parseStoredConversation(
      JSON.stringify({
        version: 1,
        selectedModelId: "provider/paid-model",
        messages: [],
      }),
    ),
    undefined,
  );
});

test("storage retains only the newest one hundred messages", () => {
  const messages = Array.from({ length: 110 }, (_, index) =>
    message(index),
  );
  const restored = parseStoredConversation(
    serializeConversation("provider/useful-model:free", messages),
  );

  assert.equal(restored?.messages.length, 100);
  assert.equal(restored?.messages[0]?.id, "message-10");
  assert.equal(restored?.messages.at(-1)?.id, "message-109");
});

test("request history keeps the newest messages within the API budget", () => {
  const messages = Array.from({ length: 6 }, (_, index) =>
    message(index, { content: String(index).repeat(20_000) }),
  );
  const history = createRequestHistory(messages);

  assert.equal(history.length, 4);
  assert.equal(history[0]?.content[0], "2");
  assert.equal(history.at(-1)?.content[0], "5");
  assert.ok(
    history.reduce((total, item) => total + item.content.length, 0) <=
      90_000,
  );
});
