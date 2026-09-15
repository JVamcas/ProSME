import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import {
  completeChecklistTaskSchema,
  idempotencyKeySchema,
  taskInstanceIdSchema,
} from "@/modules/work-queue/WorkQueueSchemas";
import { completeChecklistTask } from "@/modules/work-queue/ServerWorkflowTaskService";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    const { id } = await context.params;
    const input = completeChecklistTaskSchema.parse(
      await request.json().catch(() => undefined),
    );
    const idempotencyKey = idempotencyKeySchema.parse(
      request.headers.get("Idempotency-Key"),
    );
    return portalRouteSuccess(
      await completeChecklistTask(
        user,
        taskInstanceIdSchema.parse(id),
        input,
        { correlationId, idempotencyKey },
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
