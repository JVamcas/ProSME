import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalListRouteSuccess,
  portalRouteError,
} from "@/lib/api/PortalApiResponse";
import { getPendingWorkflowCoiReviews } from "@/modules/workflows/application/runtime/ServerWorkflowCoiReviewService";
import { workflowCoiReviewListSchema } from "@/modules/workflows/api/WorkflowCoiReviewSchemas";

export async function GET(request: Request) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    const input = workflowCoiReviewListSchema.parse(
      Object.fromEntries(new URL(request.url).searchParams.entries()),
    );
    const page = await getPendingWorkflowCoiReviews(user, input);
    return portalListRouteSuccess(page.items, correlationId, {
      nextCursor: null,
      page: page.page,
      pageSize: page.pageSize,
      total: page.total,
    });
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
