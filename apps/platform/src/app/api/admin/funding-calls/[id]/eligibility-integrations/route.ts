import { z } from "zod";

import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { eligibilityIntegrationBindingSchema } from "@/modules/eligibility/api/EligibilityIntegrationSchemas";
import { bindFundingCallEligibilityIntegration } from "@/modules/eligibility/application/ServerEligibilityIntegrationService";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const correlationId = createCorrelationId();
  try {
    const fundingCallId = z.uuid().parse((await context.params).id);
    const input = eligibilityIntegrationBindingSchema.parse(await request.json());
    return portalRouteSuccess(
      await bindFundingCallEligibilityIntegration(
        await resolveUserFromHeaders(request.headers),
        fundingCallId,
        input,
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
