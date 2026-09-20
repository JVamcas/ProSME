import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalListRouteSuccess,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import {
  eligibilityRuleSetCreateSchema,
  eligibilityRuleSetListSchema,
} from "@/modules/eligibility/api/EligibilityRuleSetSchemas";
import { getEligibilityRuleSets } from "@/modules/eligibility/application/ServerEligibilityBuilderService";
import { createNewEligibilityRuleSet } from "@/modules/eligibility/application/ServerEligibilityRuleSetService";

export async function GET(request: Request) {
  const correlationId = createCorrelationId();
  try {
    const input = eligibilityRuleSetListSchema.parse(
      Object.fromEntries(new URL(request.url).searchParams.entries()),
    );
    const page = await getEligibilityRuleSets(
      await resolveUserFromHeaders(request.headers),
      input,
    );
    return portalListRouteSuccess(page.items, correlationId, {
      nextCursor: page.page < page.totalPages ? String(page.page + 1) : null,
      page: page.page,
      pageSize: page.pageSize,
      total: page.total,
      totalPages: page.totalPages,
    });
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}

export async function POST(request: Request) {
  const correlationId = createCorrelationId();
  try {
    const input = eligibilityRuleSetCreateSchema.parse(await request.json());
    return portalRouteSuccess(
      await createNewEligibilityRuleSet(
        await resolveUserFromHeaders(request.headers),
        input,
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
