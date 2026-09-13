import { z } from "zod";

import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { getFundingOpportunity } from "@/modules/funding-opportunities/ServerFundingOpportunityService";

const paramsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const correlationId = createCorrelationId();

  try {
    const user = await resolveUserFromHeaders(request.headers);
    const { id } = paramsSchema.parse(await context.params);
    return portalRouteSuccess(
      await getFundingOpportunity(user, id),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
