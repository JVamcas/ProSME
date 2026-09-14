import { NextResponse } from "next/server";
import { z } from "zod";

import {
  AuthenticationRequiredError,
  PermissionDeniedError,
} from "@/auth/authorization/policy";
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from "@/lib/resource-errors";

type ApiErrorCode =
  | "CONFLICT"
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

export function portalRouteSuccess<TData>(
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

export function portalListRouteSuccess<TData>(
  data: TData[],
  correlationId: string,
  page: {
    nextCursor: string | null;
    total: number;
  },
) {
  return NextResponse.json(
    {
      data,
      page,
      meta: {
        correlationId,
      },
    },
    {
      headers: responseHeaders(correlationId),
    },
  );
}

export function portalRouteError(
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
      "Review the highlighted request fields.",
      validationFields(error),
    );
  }

  if (error instanceof ResourceNotFoundError) {
    return errorResponse(
      correlationId,
      404,
      "NOT_FOUND",
      error.userMessage,
    );
  }

  if (error instanceof ResourceConflictError) {
    return errorResponse(
      correlationId,
      409,
      "CONFLICT",
      error.userMessage,
    );
  }

  console.error("Portal request failed", {
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
