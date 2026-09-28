import type { FreeModel, FreeModelId } from "@/types/models";

const MAX_MODELS = 200;
const MAX_MODEL_ID_LENGTH = 240;
const MAX_MODEL_NAME_LENGTH = 240;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isZeroPrice(value: unknown): boolean {
  if (typeof value === "number") {
    return Number.isFinite(value) && value === 0;
  }

  if (typeof value !== "string" || !value.trim()) {
    return false;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed === 0;
}

function hasOnlyZeroPricing(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  if (!isZeroPrice(value.prompt) || !isZeroPrice(value.completion)) {
    return false;
  }

  return Object.values(value).every(
    (price) => price === null || price === undefined || isZeroPrice(price),
  );
}

function supportsTextOutput(value: unknown): boolean {
  return (
    isRecord(value) &&
    Array.isArray(value.output_modalities) &&
    value.output_modalities.includes("text")
  );
}

export function isFreeModelId(value: string): value is FreeModelId {
  return (
    value.length <= MAX_MODEL_ID_LENGTH &&
    /^[^/\s]+\/[^\s]+:free$/.test(value)
  );
}

function cleanModelName(value: string): string {
  return value.replace(/\s*\(free\)\s*$/i, "").trim();
}

function parseContextLength(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? value
    : null;
}

function parseModel(value: unknown): FreeModel | undefined {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    !isFreeModelId(value.id) ||
    typeof value.name !== "string" ||
    !value.name.trim() ||
    value.name.length > MAX_MODEL_NAME_LENGTH ||
    !hasOnlyZeroPricing(value.pricing) ||
    !supportsTextOutput(value.architecture)
  ) {
    return undefined;
  }

  return {
    id: value.id,
    name: cleanModelName(value.name),
    provider: value.id.slice(0, value.id.indexOf("/")),
    contextLength: parseContextLength(value.context_length),
  };
}

export function parseOpenRouterFreeModels(payload: unknown): FreeModel[] {
  if (!isRecord(payload) || !Array.isArray(payload.data)) {
    return [];
  }

  const models: FreeModel[] = [];
  const seenIds = new Set<string>();

  for (const candidate of payload.data) {
    const model = parseModel(candidate);

    if (!model || seenIds.has(model.id)) {
      continue;
    }

    seenIds.add(model.id);
    models.push(model);

    if (models.length === MAX_MODELS) {
      break;
    }
  }

  return models;
}

export function findFreeModelById(
  models: readonly FreeModel[],
  id: string,
): FreeModel | undefined {
  return isFreeModelId(id)
    ? models.find((model) => model.id === id)
    : undefined;
}
