import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { taskInstanceIdSchema } from "@/modules/work-queue/WorkQueueSchemas";
import { getWorkflowTask } from "@/modules/work-queue/ServerWorkflowTaskService";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    const { id } = await context.params;
    return portalRouteSuccess(
      await getWorkflowTask(user, taskInstanceIdSchema.parse(id)),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
