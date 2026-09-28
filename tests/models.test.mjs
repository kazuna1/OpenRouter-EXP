import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_MODEL_ID,
  fallbackModels,
  getFallbackModelById,
} from "../data/models.ts";

test("fallback registry contains unique free model entries", () => {
  assert.equal(fallbackModels.length, 5);
  assert.equal(
    new Set(fallbackModels.map(({ id }) => id)).size,
    fallbackModels.length,
  );

  for (const model of fallbackModels) {
    assert.ok(model.id);
    assert.ok(model.name);
    assert.ok(model.provider);
    assert.match(model.id, /^[^/]+\/.+:free$/);
    assert.equal(getFallbackModelById(model.id), model);
  }
});

test("default model always resolves through the registry", () => {
  assert.equal(DEFAULT_MODEL_ID, fallbackModels[0].id);
  assert.equal(
    getFallbackModelById(DEFAULT_MODEL_ID),
    fallbackModels[0],
  );
  assert.equal(getFallbackModelById("missing"), undefined);
});
