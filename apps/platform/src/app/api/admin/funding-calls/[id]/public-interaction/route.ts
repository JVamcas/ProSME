import { z } from "zod";
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { fundingCallPublicInteractionSchema } from "@/modules/funding-calls/api/FundingCallPublicInteractionSchemas";
import { setFundingCallPublicInteraction } from "@/modules/funding-calls/application/ServerFundingCallPublicInteractionService";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const correlationId = createCorrelationId();
  try {
    const id = z.uuid().parse((await context.params).id);
    const input = fundingCallPublicInteractionSchema.parse(
      await request.json(),
    );
    const user = await resolveUserFromHeaders(request.headers);
    return portalRouteSuccess(
      await setFundingCallPublicInteraction(user, id, input),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
