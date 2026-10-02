import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { AuthenticationRequiredError, PermissionDeniedError } from "@/auth/authorization/policy";
import { logger } from "@/integrations/monitoring/logger";
import { processConfiguredWorkflowDeadlineBatch } from "@/modules/workflows/application/runtime/ServerWorkflowDeadlineService";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const suppliedId = request.headers.get("x-request-id");
  const requestId = suppliedId
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(suppliedId)
    ? suppliedId
    : randomUUID();
  const headers = { "Cache-Control": "no-store" };
  try {
    const data = await processConfiguredWorkflowDeadlineBatch(
      request.headers.get("authorization"), requestId,
    );
    if (data.claimed) logger.info("workflow.processor.completed", { requestId, ...data });
    return NextResponse.json({ data }, { headers });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Service authentication is required." } },
        { headers, status: 401 },
      );
    }
    if (error instanceof PermissionDeniedError) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Workflow processor permission is required." } },
        { headers, status: 403 },
      );
    }
    logger.error("workflow.processor.failed", {
      requestId,
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json(
      { error: { code: "PROCESSING_FAILED", message: "Workflow deadline processing failed." } },
      { headers, status: 500 },
    );
  }
}
