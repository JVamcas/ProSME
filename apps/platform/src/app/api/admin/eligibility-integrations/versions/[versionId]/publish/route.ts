import { z } from "zod";

import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { publishEligibilityIntegration } from "@/modules/eligibility/application/ServerEligibilityIntegrationService";

type RouteContext = { params: Promise<{ versionId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const correlationId = createCorrelationId();
  try {
    const versionId = z.uuid().parse((await context.params).versionId);
    return portalRouteSuccess(
      await publishEligibilityIntegration(
        await resolveUserFromHeaders(request.headers),
        versionId,
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
