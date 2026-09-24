import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { eligibilityIntegrationCreateSchema } from "@/modules/eligibility/api/EligibilityIntegrationSchemas";
import {
  createNewEligibilityIntegration,
  listEligibilityIntegrations,
} from "@/modules/eligibility/application/ServerEligibilityIntegrationService";

export async function GET(request: Request) {
  const correlationId = createCorrelationId();
  try {
    return portalRouteSuccess(
      await listEligibilityIntegrations(
        await resolveUserFromHeaders(request.headers),
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}

export async function POST(request: Request) {
  const correlationId = createCorrelationId();
  try {
    const input = eligibilityIntegrationCreateSchema.parse(await request.json());
    return portalRouteSuccess(
      await createNewEligibilityIntegration(
        await resolveUserFromHeaders(request.headers),
        input,
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
