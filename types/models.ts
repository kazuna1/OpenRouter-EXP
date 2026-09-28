export type FreeModelId = `${string}/${string}:free`;

export interface FreeModel {
  readonly id: FreeModelId;
  readonly name: string;
  readonly provider: string;
  readonly contextLength: number | null;
}

export type ModelCatalogSource = "openrouter" | "fallback";

export interface FreeModelCatalog {
  readonly models: readonly FreeModel[];
  readonly source: ModelCatalogSource;
}

export interface ModelsResponse {
  readonly models: readonly FreeModel[];
  readonly source: ModelCatalogSource;
}
