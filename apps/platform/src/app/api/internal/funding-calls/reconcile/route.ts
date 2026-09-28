import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { logger } from "@/integrations/monitoring/logger";
import {
  getFundingCallLifecycleProcessorConfiguration,
  isAuthorizedFundingCallLifecycleRequest,
} from "@/modules/funding-calls/application/FundingCallLifecycleProcessorConfiguration";
import { reconcileFundingCallLifecycle } from "@/modules/funding-calls/application/ServerFundingCallLifecycleService";

export const runtime = "nodejs";
export const maxDuration = 60;

const responseHeaders = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
};

export async function POST(request: Request) {
  const requestId = request.headers.get("x-request-id") ?? randomUUID();
  const configuration = getFundingCallLifecycleProcessorConfiguration();
  if (!isAuthorizedFundingCallLifecycleRequest(
    request.headers.get("authorization"),
    configuration.FUNDING_CALL_LIFECYCLE_PROCESSOR_SECRET,
  )) {
    logger.warn("funding-call.lifecycle.unauthenticated", { requestId });
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Service authentication is required." } },
      { headers: responseHeaders, status: 401 },
    );
  }

  try {
    const now = new Date();
    const { closing, opening } = await reconcileFundingCallLifecycle(now);
    logger.info("funding-call.lifecycle.completed", {
      closingAttempted: closing.attempted,
      closingFailed: closing.failed,
      closingTransitioned: closing.transitioned,
      openingAttempted: opening.attempted,
      openingFailed: opening.failed,
      openingTransitioned: opening.transitioned,
      requestId,
    });
    return NextResponse.json(
      { data: { closing, opening } },
      { headers: responseHeaders },
    );
  } catch (error) {
    logger.error("funding-call.lifecycle.failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
      requestId,
    });
    return NextResponse.json(
      { error: { code: "PROCESSING_FAILED", message: "Lifecycle processing failed." } },
      { headers: responseHeaders, status: 500 },
    );
  }
}
