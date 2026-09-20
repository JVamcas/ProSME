import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { eligibilityRuleSetBuilderSchema } from "@/modules/eligibility/api/EligibilityRuleSetSchemas";
import {
  getEligibilityRuleSetBuilder,
  saveEligibilityRuleSetBuilder,
} from "@/modules/eligibility/application/ServerEligibilityBuilderService";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const correlationId = createCorrelationId();
  try {
    const { id } = await context.params;
    return portalRouteSuccess(
      await getEligibilityRuleSetBuilder(
        await resolveUserFromHeaders(request.headers),
        id,
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const correlationId = createCorrelationId();
  try {
    const input = eligibilityRuleSetBuilderSchema.parse(await request.json());
    const { id } = await context.params;
    return portalRouteSuccess(
      await saveEligibilityRuleSetBuilder(
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
