import { NextResponse } from "next/server";
import { AuthenticationRequiredError } from "@/auth/authorization/policy";
import { logger } from "@/integrations/monitoring/logger";
import { processReporting } from "@/modules/reporting/ServerReportingProcessorService";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  try {
    const data = await processReporting(request.headers.get("authorization"));
    return NextResponse.json({ data }, { headers });
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return NextResponse.json(
        {
          error: {
            code: "UNAUTHENTICATED",
            message: "Service authentication is required.",
          },
        },
        {
          headers,
          status: 401,
        },
      );
    }
    logger.error("reporting.synchronization.failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json(
      {
        error: {
          code: "PROCESSING_FAILED",
          message: "Analytics synchronization failed.",
        },
      },
      {
        headers,
        status: 500,
      },
    );
  }
}
