import { getFreeModelCatalog } from "@/lib/openrouter-models";
import type { ModelsResponse } from "@/types/models";

export async function GET(): Promise<Response> {
  const catalog = await getFreeModelCatalog();
  const body: ModelsResponse = {
    models: catalog.models,
    source: catalog.source,
  };

  return Response.json(body, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
