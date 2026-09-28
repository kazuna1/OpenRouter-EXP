import type { FreeModel, FreeModelId } from "@/types/models";

export const fallbackModels = [
  {
    id: "google/gemma-4-26b-a4b-it:free",
    name: "Google: Gemma 4 26B",
    provider: "google",
    contextLength: 131_072,
  },
  {
    id: "nvidia/nemotron-3-super-120b-a12b:free",
    name: "NVIDIA: Nemotron 3 Super 120B",
    provider: "nvidia",
    contextLength: 262_144,
  },
  {
    id: "inclusionai/ling-3.0-flash:free",
    name: "InclusionAI: Ling 3.0 Flash",
    provider: "inclusionai",
    contextLength: 262_144,
  },
  {
    id: "openai/gpt-oss-20b:free",
    name: "OpenAI: GPT-OSS 20B",
    provider: "openai",
    contextLength: 131_072,
  },
  {
    id: "poolside/laguna-s-2.1:free",
    name: "Poolside: Laguna S 2.1",
    provider: "poolside",
    contextLength: 262_144,
  },
] as const satisfies readonly FreeModel[];

export const DEFAULT_MODEL_ID: FreeModelId = fallbackModels[0].id;

const fallbackModelsById: ReadonlyMap<string, FreeModel> = new Map(
  fallbackModels.map((model) => [model.id, model]),
);

export function getFallbackModelById(id: string): FreeModel | undefined {
  return fallbackModelsById.get(id);
}
