import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { taskInstanceIdSchema } from "@/modules/work-queue/WorkQueueSchemas";
import { workflowEscalationCancellationSchema } from "@/modules/workflows/domain/runtime/WorkflowEscalationCancellation";
import { cancelWorkflowEscalation } from "@/modules/workflows/application/runtime/ServerWorkflowEscalationCancellationService";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const correlationId = createCorrelationId();
  try {
    const [user, params, body] = await Promise.all([
      resolveUserFromHeaders(request.headers),
      context.params,
      request.json().catch(() => undefined),
    ]);
    return portalRouteSuccess(
      await cancelWorkflowEscalation(user, {
        ...workflowEscalationCancellationSchema.parse(body),
        taskId: taskInstanceIdSchema.parse(params.id),
        correlationId,
      }),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
