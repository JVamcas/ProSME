import { z } from "zod";

import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { eligibilityAssessmentSchema } from "@/modules/eligibility/EligibilitySchemas";
import {
  createEligibilityAssessment,
  getEligibilityWorkspace,
} from "@/modules/eligibility/ServerEligibilityService";

const querySchema = z.object({
  fundingOpportunityId: z.coerce.number().int().positive(),
}).strict();



export async function GET(request: Request) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    const url = new URL(request.url);
    const query = querySchema.parse(Object.fromEntries(url.searchParams));
    const workspace = await getEligibilityWorkspace(
      user,
      query.fundingOpportunityId,
    );
    return portalRouteSuccess(workspace, correlationId);
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}

export async function POST(request: Request) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    const input = eligibilityAssessmentSchema.parse(await request.json());
    const assessment = await createEligibilityAssessment(user, input);
    return portalRouteSuccess(assessment, correlationId);
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}

