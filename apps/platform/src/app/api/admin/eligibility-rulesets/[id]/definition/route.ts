import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { eligibilityRuleSetCreateSchema } from "@/modules/eligibility/api/EligibilityRuleSetSchemas";
import { updateEligibilityRuleSetMetadata } from "@/modules/eligibility/application/ServerEligibilityRuleSetService";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const correlationId = createCorrelationId();
  try {
    const input = eligibilityRuleSetCreateSchema.parse(await request.json());
    const { id } = await context.params;
    return portalRouteSuccess(
      await updateEligibilityRuleSetMetadata(
        await resolveUserFromHeaders(request.headers),
        id,
        input,
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
