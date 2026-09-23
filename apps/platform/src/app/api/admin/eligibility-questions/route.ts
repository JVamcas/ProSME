import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalListRouteSuccess,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import {
  eligibilityQuestionInputSchema,
  eligibilityQuestionListSchema,
} from "@/modules/eligibility/api/EligibilityQuestionSchemas";
import {
  createEligibilityQuestion,
  getEligibilityQuestions,
} from "@/modules/eligibility/application/ServerEligibilityQuestionService";

export async function GET(request: Request) {
  const correlationId = createCorrelationId();
  try {
    const input = eligibilityQuestionListSchema.parse(
      Object.fromEntries(new URL(request.url).searchParams.entries()),
    );
    const page = await getEligibilityQuestions(
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
    const input = eligibilityQuestionInputSchema.parse(await request.json());
    return portalRouteSuccess(
      await createEligibilityQuestion(
        await resolveUserFromHeaders(request.headers),
        input,
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
