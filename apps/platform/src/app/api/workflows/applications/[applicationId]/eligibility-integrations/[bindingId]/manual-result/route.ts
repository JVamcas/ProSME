import { z } from "zod";

import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { eligibilityIntegrationManualResultSchema } from "@/modules/eligibility/api/EligibilityIntegrationSchemas";
import { recordManualEligibilityIntegrationResult } from "@/modules/eligibility/application/ServerEligibilityIntegrationService";

type RouteContext = {
  params: Promise<{ applicationId: string; bindingId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const correlationId = createCorrelationId();
  try {
    const params = await context.params;
    const applicationId = z.uuid().parse(params.applicationId);
    const bindingId = z.uuid().parse(params.bindingId);
    const input = eligibilityIntegrationManualResultSchema.parse(
      await request.json(),
    );
    return portalRouteSuccess(
      await recordManualEligibilityIntegrationResult(
        await resolveUserFromHeaders(request.headers),
        applicationId,
        bindingId,
        input,
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
