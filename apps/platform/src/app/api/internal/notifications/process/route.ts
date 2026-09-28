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
  const configuration = getNotificationProcessorConfiguration();
  if (!isAuthorizedNotificationProcessorRequest(
    request.headers.get("authorization"),
    configuration.NOTIFICATION_PROCESSOR_SECRET,
  )) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Service authentication is required." } },
      { headers: responseHeaders, status: 401 },
    );
  }

  try {
    const result = await processConfiguredNotificationBatch();
    return NextResponse.json(
      { data: result },
      { headers: responseHeaders },
    );
  } catch {
    logger.error("notification.batch.failed");
    return NextResponse.json(
      { error: { code: "PROCESSING_FAILED", message: "Notification processing failed." } },
      { headers: responseHeaders, status: 500 },
    );
  }
}
