import { z } from "zod";

import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { cloneFundingCall } from "@/modules/funding-calls/application/ServerFundingCallService";

type RouteContext = { params: Promise<{ id: string }> };
const idSchema = z.uuid();

export async function POST(request: Request, context: RouteContext) {
  const correlationId = createCorrelationId();
  try {
    const id = idSchema.parse((await context.params).id);
    return portalRouteSuccess(
      await cloneFundingCall(
        await resolveUserFromHeaders(request.headers),
        id,
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
