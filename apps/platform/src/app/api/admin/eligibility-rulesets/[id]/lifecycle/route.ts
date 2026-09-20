import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { eligibilityRuleSetLifecycleSchema } from "@/modules/eligibility/api/EligibilityRuleSetSchemas";
import {
  cloneEligibilityRuleSet,
  publishEligibilityRuleSet,
  retireEligibilityRuleSet,
} from "@/modules/eligibility/application/ServerEligibilityRuleSetService";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const correlationId = createCorrelationId();
  try {
    const input = eligibilityRuleSetLifecycleSchema.parse(await request.json());
    const { id } = await context.params;
    const user = await resolveUserFromHeaders(request.headers);
    if (input.action === "CLONE") {
      return portalRouteSuccess(
        await cloneEligibilityRuleSet(user, id, input.sourceVersionId),
        correlationId,
      );
    }
    const command = { expectedRowVersion: input.expectedRowVersion };
    return portalRouteSuccess(
      input.action === "PUBLISH"
        ? await publishEligibilityRuleSet(user, id, input.versionId, command)
        : await retireEligibilityRuleSet(user, id, input.versionId, command),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
