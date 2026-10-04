import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { taskInstanceIdSchema } from "@/modules/work-queue/WorkQueueSchemas";
import { getWorkflowEscalationTracking } from "@/modules/workflows/application/runtime/ServerWorkflowEscalationTrackingService";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const correlationId = createCorrelationId();
  try {
    const [user, params] = await Promise.all([
      resolveUserFromHeaders(request.headers),
      context.params,
    ]);
    return portalRouteSuccess(
      await getWorkflowEscalationTracking(
        user,
        taskInstanceIdSchema.parse(params.id),
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
