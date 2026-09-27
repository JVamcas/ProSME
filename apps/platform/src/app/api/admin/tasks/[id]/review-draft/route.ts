import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { saveTaskReviewDraft } from "@/modules/work-queue/ServerWorkflowTaskService";
import {
  saveTaskReviewDraftSchema,
  taskInstanceIdSchema,
} from "@/modules/work-queue/WorkQueueSchemas";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    const { id } = await context.params;
    const input = saveTaskReviewDraftSchema.parse(
      await request.json().catch(() => undefined),
    );
    return portalRouteSuccess(
      await saveTaskReviewDraft(
        user,
        taskInstanceIdSchema.parse(id),
        input,
        correlationId,
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
