import { z } from "zod";

import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { eligibilityIntegrationVersionCreateSchema } from "@/modules/eligibility/api/EligibilityIntegrationSchemas";
import { createNewEligibilityIntegrationVersion } from "@/modules/eligibility/application/ServerEligibilityIntegrationService";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const correlationId = createCorrelationId();
  try {
    const definitionId = z.uuid().parse((await context.params).id);
    const input = eligibilityIntegrationVersionCreateSchema.parse(
      await request.json(),
    );
    return portalRouteSuccess(
      await createNewEligibilityIntegrationVersion(
        await resolveUserFromHeaders(request.headers),
        definitionId,
        input,
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
