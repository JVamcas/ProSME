import { NextResponse } from "next/server";
import { z } from "zod";

import {
  AuthenticationRequiredError,
  PermissionDeniedError,
} from "@/auth/authorization/policy";
import { BusinessNotFoundError } from "@/modules/businesses/ServerBusinessService";

type ApiErrorCode =
  | "FORBIDDEN"
  | "INTERNAL_ERROR"
  | "NOT_FOUND"
  | "UNAUTHENTICATED"
  | "VALIDATION_ERROR";

function responseHeaders(correlationId: string) {
  return {
    "Cache-Control": "no-store",
    "X-Correlation-Id": correlationId,
  };
}

function errorResponse(
  correlationId: string,
  status: number,
  code: ApiErrorCode,
  message: string,
  fields: Record<string, string[]> = {},
) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        fields,
      },
      meta: {
        correlationId,
      },
    },
    {
      status,
      headers: responseHeaders(correlationId),
    },
  );
}

function validationFields(error: z.ZodError) {
  return error.issues.reduce<Record<string, string[]>>((fields, issue) => {
    const field = issue.path.join(".") || "request";
    fields[field] = [...(fields[field] ?? []), issue.message];
    return fields;
  }, {});
}

export function createCorrelationId() {
  return crypto.randomUUID();
}

export function profileRouteSuccess<TData>(
  data: TData,
  correlationId: string,
) {
  return NextResponse.json(
    {
      data,
      meta: {
        correlationId,
      },
    },
    {
      headers: responseHeaders(correlationId),
    },
  );
}

export function profileRouteError(
  error: unknown,
  correlationId: string,
) {
  if (error instanceof AuthenticationRequiredError) {
    return errorResponse(
      correlationId,
      401,
      "UNAUTHENTICATED",
      "Authentication is required.",
    );
  }

  if (error instanceof PermissionDeniedError) {
    return errorResponse(
      correlationId,
      403,
      "FORBIDDEN",
      "You do not have permission to access this resource.",
    );
  }

  if (error instanceof z.ZodError) {
    return errorResponse(
      correlationId,
      400,
      "VALIDATION_ERROR",
      "Review the highlighted profile fields.",
      validationFields(error),
    );
  }

  if (error instanceof BusinessNotFoundError) {
    return errorResponse(
      correlationId,
      404,
      "NOT_FOUND",
      "The requested business was not found.",
    );
  }

  console.error("Portal profile request failed", {
    correlationId,
    error,
  });

  return errorResponse(
    correlationId,
    500,
    "INTERNAL_ERROR",
    "The request could not be completed.",
  );
}
