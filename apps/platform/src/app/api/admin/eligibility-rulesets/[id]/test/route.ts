import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { eligibilityTestSchema } from "@/modules/eligibility/api/EligibilityTestSchemas";
import { testEligibilityRuleSet } from "@/modules/eligibility/application/ServerEligibilityTestService";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const correlationId = createCorrelationId();
  try {
    const input = eligibilityTestSchema.parse(await request.json());
    const { id } = await context.params;
    return portalRouteSuccess(
      await testEligibilityRuleSet(
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
