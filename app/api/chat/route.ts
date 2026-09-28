import { parseChatRequest } from "@/lib/chat-request";
import { findFreeModelById } from "@/lib/model-catalog";
import {
  createOpenRouterCompletion,
  OpenRouterError,
} from "@/lib/openrouter";
import { getFreeModelCatalog } from "@/lib/openrouter-models";
import type {
  ChatErrorCode,
  ChatErrorResponse,
  ChatHistoryMessage,
  ChatResponse,
} from "@/types/chat";

function errorResponse(
  code: ChatErrorCode,
  message: string,
  status: number,
): Response {
  const body: ChatErrorResponse = {
    error: {
      code,
      message,
    },
  };

  return Response.json(body, { status });
}

function openRouterErrorResponse(error: OpenRouterError): Response {
  if (error.reason === "configuration") {
    return errorResponse(
      "SERVER_CONFIGURATION_ERROR",
      "The chat service is not configured.",
      503,
    );
  }

  if (error.reason === "timeout") {
    return errorResponse(
      "MODEL_UNAVAILABLE",
      "Model unavailable. Please try another model.",
      504,
    );
  }

  return errorResponse(
    error.reason === "invalid_response"
      ? "OPENROUTER_ERROR"
      : "MODEL_UNAVAILABLE",
    "Model unavailable. Please try another model.",
    error.status === 429 ? 429 : 502,
  );
}

export async function POST(request: Request): Promise<Response> {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return errorResponse(
      "INVALID_REQUEST",
      "Please send a valid chat request.",
      400,
    );
  }

  const chatRequest = parseChatRequest(payload);

  if (!chatRequest) {
    return errorResponse(
      "INVALID_REQUEST",
      "Please provide a model and a non-empty message.",
      400,
    );
  }

  const catalog = await getFreeModelCatalog();
  const selectedModel = findFreeModelById(
    catalog.models,
    chatRequest.model,
  );

  if (!selectedModel) {
    return errorResponse(
      "MODEL_NOT_FOUND",
      "Please select an available model.",
      404,
    );
  }

  const messages: ChatHistoryMessage[] = [
    ...(chatRequest.history ?? []),
    {
      role: "user",
      content: chatRequest.message,
    },
  ];

  try {
    const content = await createOpenRouterCompletion({
      model: selectedModel.id,
      messages,
    });

    const body: ChatResponse = {
      content,
      model: selectedModel.id,
    };

    return Response.json(body);
  } catch (error: unknown) {
    if (error instanceof OpenRouterError) {
      return openRouterErrorResponse(error);
    }

    return errorResponse(
      "OPENROUTER_ERROR",
      "Something went wrong. Please try again.",
      500,
    );
  }
}
