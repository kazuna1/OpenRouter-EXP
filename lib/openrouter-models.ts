import "server-only";

import { fallbackModels } from "@/data/models";
import { parseOpenRouterFreeModels } from "@/lib/model-catalog";
import { getOpenRouterApiKey } from "@/lib/openrouter";
import type { FreeModelCatalog } from "@/types/models";

const OPENROUTER_MODELS_URL =
  "https://openrouter.ai/api/v1/models/user?output_modalities=text&sort=most-popular";
const CATALOG_REVALIDATE_SECONDS = 900;
const CATALOG_TIMEOUT_MS = 15_000;

function fallbackCatalog(): FreeModelCatalog {
  return {
    models: fallbackModels,
    source: "fallback",
  };
}

export async function getFreeModelCatalog(): Promise<FreeModelCatalog> {
  const apiKey = getOpenRouterApiKey();

  if (!apiKey) {
    return fallbackCatalog();
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CATALOG_TIMEOUT_MS);

  try {
    const response = await fetch(OPENROUTER_MODELS_URL, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-Title": "AI Model Playground",
      },
      next: {
        revalidate: CATALOG_REVALIDATE_SECONDS,
        tags: ["openrouter-free-models"],
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return fallbackCatalog();
    }

    const payload: unknown = await response.json();
    const models = parseOpenRouterFreeModels(payload);

    if (models.length === 0) {
      return fallbackCatalog();
    }

    return {
      models,
      source: "openrouter",
    };
  } catch {
    return fallbackCatalog();
  } finally {
    clearTimeout(timeout);
  }
}
