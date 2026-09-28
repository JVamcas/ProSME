import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { logger } from "@/integrations/monitoring/logger";
import { processConfiguredNotificationBatch } from "@/modules/notifications/application/ServerNotificationDispatchService";
import {
  getNotificationProcessorConfiguration,
  isAuthorizedNotificationProcessorRequest,
} from "@/modules/notifications/application/NotificationProcessorConfiguration";

export const runtime = "nodejs";
export const maxDuration = 60;

const responseHeaders = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
};

export async function POST(request: Request) {
  const suppliedRequestId = request.headers.get("x-request-id");
  const requestId = suppliedRequestId
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(suppliedRequestId)
    ? suppliedRequestId
    : randomUUID();
  const startedAt = Date.now();
  const configuration = getNotificationProcessorConfiguration();
  if (!isAuthorizedNotificationProcessorRequest(
    request.headers.get("authorization"),
    configuration.NOTIFICATION_PROCESSOR_SECRET,
  )) {
    logger.warn("notification.processor.unauthenticated", { requestId });
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Service authentication is required." } },
      { headers: responseHeaders, status: 401 },
    );
  }

  try {
    const result = await processConfiguredNotificationBatch();
    logger.info("notification.processor.completed", {
      ...result,
      durationMs: Date.now() - startedAt,
      requestId,
    });
    return NextResponse.json(
      { data: result },
      { headers: responseHeaders },
    );
  } catch (error) {
    logger.error("notification.processor.failed", {
      durationMs: Date.now() - startedAt,
      errorType: error instanceof Error ? error.name : "UnknownError",
      requestId,
    });
    return NextResponse.json(
      { error: { code: "PROCESSING_FAILED", message: "Notification processing failed." } },
      { headers: responseHeaders, status: 500 },
    );
  }
}
