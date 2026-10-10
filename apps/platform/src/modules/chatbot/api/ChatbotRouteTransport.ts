import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import type { AuthenticatedUser } from "@/auth/types";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { RequestValidationError } from "@/lib/resource-errors";
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from "@/lib/resource-errors";
import {
  AuthenticationRequiredError,
  PermissionDeniedError,
} from "@/auth/authorization/policy";
import { z } from "zod";
import { NextResponse } from "next/server";
import { chatbotLimits } from "../domain/ChatbotLimits";

export async function chatbotRoute<T>(
  request: Request,
  operation: (user: AuthenticatedUser | null) => Promise<T>,
) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    return portalRouteSuccess(await operation(user), correlationId);
  } catch (error) {
    return chatbotSafeRouteError(error, correlationId);
  }
}

export function chatbotSafeRouteError(error: unknown, correlationId: string) {
  if (
    error instanceof z.ZodError ||
    error instanceof RequestValidationError ||
    error instanceof ResourceConflictError ||
    error instanceof ResourceNotFoundError ||
    error instanceof AuthenticationRequiredError ||
    error instanceof PermissionDeniedError
  )
    return portalRouteError(error, correlationId);
  // SQL/provider errors may contain questions or credentials; exclude them from logs.
  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "Programme guidance could not be completed. Please retry.",
      },
      meta: { correlationId },
    },
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
}

export async function chatbotBody(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader)
    throw new RequestValidationError("A JSON request body is required.");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > chatbotLimits.requestBytes) {
        await reader.cancel();
        throw new RequestValidationError(
          "The request is too large. Shorten it and try again.",
        );
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (error) {
    if (error instanceof RequestValidationError) throw error;
    throw new RequestValidationError(
      "The request body must contain valid JSON.",
    );
  } finally {
    reader.releaseLock();
  }
}
