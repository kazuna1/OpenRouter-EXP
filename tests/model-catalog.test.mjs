import assert from "node:assert/strict";
import test from "node:test";

import {
  findFreeModelById,
  isFreeModelId,
  parseOpenRouterFreeModels,
} from "../lib/model-catalog.ts";

function catalogModel(overrides = {}) {
  return {
    id: "provider/useful-model:free",
    name: "Provider: Useful Model (free)",
    context_length: 131072,
    pricing: {
      prompt: "0",
      completion: "0",
      request: null,
      image: null,
    },
    architecture: {
      input_modalities: ["text"],
      output_modalities: ["text"],
    },
    ...overrides,
  };
}

test("keeps only unique text models with entirely zero pricing", () => {
  const payload = {
    data: [
      catalogModel(),
      catalogModel(),
      catalogModel({
        id: "provider/paid-model",
        name: "Paid model",
      }),
      catalogModel({
        id: "provider/deceptive-free:free",
        pricing: { prompt: "0", completion: "0.000001" },
      }),
      catalogModel({
        id: "provider/request-priced:free",
        pricing: { prompt: "0", completion: "0", request: "0.01" },
      }),
      catalogModel({
        id: "provider/image-priced:free",
        pricing: { prompt: "0", completion: "0", image: "0.01" },
      }),
      catalogModel({
        id: "provider/image-output:free",
        architecture: {
          input_modalities: ["text"],
          output_modalities: ["image"],
        },
      }),
    ],
  };

  assert.deepEqual(parseOpenRouterFreeModels(payload), [
    {
      id: "provider/useful-model:free",
      name: "Provider: Useful Model",
      provider: "provider",
      contextLength: 131072,
    },
  ]);
});

test("rejects malformed catalog payloads", () => {
  assert.deepEqual(parseOpenRouterFreeModels(null), []);
  assert.deepEqual(parseOpenRouterFreeModels({}), []);
  assert.deepEqual(parseOpenRouterFreeModels({ data: "invalid" }), []);
  assert.deepEqual(
    parseOpenRouterFreeModels({
      data: [
        catalogModel({ name: "" }),
        catalogModel({ pricing: null }),
        catalogModel({ architecture: null }),
      ],
    }),
    [],
  );
});

test("normalizes unknown context length without rejecting a safe model", () => {
  assert.equal(
    parseOpenRouterFreeModels({
      data: [catalogModel({ context_length: "unknown" })],
    })[0]?.contextLength,
    null,
  );
});

test("forged paid IDs cannot resolve through the free allowlist", () => {
  const models = parseOpenRouterFreeModels({
    data: [catalogModel()],
  });

  assert.equal(isFreeModelId("provider/useful-model:free"), true);
  assert.equal(isFreeModelId("provider/useful-model"), false);
  assert.equal(
    findFreeModelById(models, "provider/useful-model:free"),
    models[0],
  );
  assert.equal(
    findFreeModelById(models, "provider/useful-model"),
    undefined,
  );
  assert.equal(
    findFreeModelById(models, "provider/other-model:free"),
    undefined,
  );
});
