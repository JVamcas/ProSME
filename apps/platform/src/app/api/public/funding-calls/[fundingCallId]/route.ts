import { z } from "zod";

import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { getPublicFundingCallById } from "@/modules/funding-calls/application/ServerPublicFundingCallService";

const paramsSchema = z.object({
  fundingCallId: z.uuid(),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ fundingCallId: string }> },
) {
  const correlationId = createCorrelationId();

  try {
    const { fundingCallId } = paramsSchema.parse(await context.params);
    return portalRouteSuccess(
      await getPublicFundingCallById(fundingCallId),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
