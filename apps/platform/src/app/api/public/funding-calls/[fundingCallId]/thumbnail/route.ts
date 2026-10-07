import { z } from "zod";

import { fundingCallThumbnailWidthSchema } from "@/modules/funding-calls/api/FundingCallSchemas";
import { readPublicFundingCallThumbnail } from "@/modules/funding-calls/application/ServerFundingCallThumbnailService";

type RouteContext = { params: Promise<{ fundingCallId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const width = fundingCallThumbnailWidthSchema.safeParse(
    new URL(request.url).searchParams.get("width") ?? undefined,
  );
  if (!width.success) return new Response(null, { status: 400 });
  try {
    const id = z.uuid().parse((await context.params).fundingCallId);
    const thumbnail = await readPublicFundingCallThumbnail(id, undefined, width.data);
    return new Response(new Uint8Array(thumbnail.body), {
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Content-Type": thumbnail.contentType,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
