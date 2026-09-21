import { z } from "zod";

import {
  createCorrelationId,
  portalListRouteSuccess,
  portalRouteError,
} from "@/lib/api/PortalApiResponse";
import { listPublicFundingCalls } from "@/modules/funding-calls/application/ServerPublicFundingCallService";

const querySchema = z
  .object({
    after: z.string().max(500).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    search: z.string().trim().min(1).max(100).optional(),
    status: z.enum(["upcoming", "open", "closed"]).optional(),
  })
  .strict();

export async function GET(request: Request) {
  const correlationId = createCorrelationId();

  try {
    const url = new URL(request.url);
    const input = querySchema.parse(Object.fromEntries(url.searchParams));
    const result = await listPublicFundingCalls(input);
    return portalListRouteSuccess(result.items, correlationId, {
      nextCursor: result.nextCursor,
      total: result.total,
    });
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
