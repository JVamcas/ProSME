import { z } from "zod";

import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { previewFundingCallReadiness } from "@/modules/funding-calls/application/ServerFundingCallReadinessService";

type RouteContext = { params: Promise<{ id: string }> };
const idSchema = z.uuid();

export async function GET(request: Request, context: RouteContext) {
  const correlationId = createCorrelationId();
  try {
    const id = idSchema.parse((await context.params).id);
    return portalRouteSuccess(
      await previewFundingCallReadiness(
        await resolveUserFromHeaders(request.headers),
        id,
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
