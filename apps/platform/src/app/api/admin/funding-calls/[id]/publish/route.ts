import { z } from "zod";

import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { fundingCallPublishSchema } from "@/modules/funding-calls/api/FundingCallSchemas";
import { publishFundingCall } from "@/modules/funding-calls/application/ServerFundingCallPublicationService";

type RouteContext = { params: Promise<{ id: string }> };
const idSchema = z.uuid();

export async function POST(request: Request, context: RouteContext) {
  const correlationId = createCorrelationId();
  try {
    const id = idSchema.parse((await context.params).id);
    const input = fundingCallPublishSchema.parse(await request.json());
    return portalRouteSuccess(
      await publishFundingCall(
        await resolveUserFromHeaders(request.headers),
        id,
        input,
        request.headers.get("Idempotency-Key")?.trim() || correlationId,
        correlationId,
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
