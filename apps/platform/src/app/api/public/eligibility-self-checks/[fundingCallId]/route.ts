import { z } from "zod";

import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { publicEligibilitySelfCheckInputSchema } from "@/modules/eligibility/api/PublicEligibilitySelfCheckSchemas";
import {
  evaluatePublicEligibilitySelfCheck,
  getPublicEligibilitySelfCheck,
} from "@/modules/eligibility/application/ServerPublicEligibilitySelfCheckService";

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
      await getPublicEligibilitySelfCheck(fundingCallId),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ fundingCallId: string }> },
) {
  const correlationId = createCorrelationId();
  try {
    const { fundingCallId } = paramsSchema.parse(await context.params);
    const input = publicEligibilitySelfCheckInputSchema.parse(
      await request.json(),
    );
    return portalRouteSuccess(
      await evaluatePublicEligibilitySelfCheck(fundingCallId, input),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
