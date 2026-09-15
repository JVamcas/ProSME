import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import {
  claimTaskSchema,
  idempotencyKeySchema,
  taskInstanceIdSchema,
} from "@/modules/work-queue/WorkQueueSchemas";
import { claimTask } from "@/modules/work-queue/ServerWorkQueueService";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    const { id } = await context.params;
    const input = claimTaskSchema.parse(
      await request.json().catch(() => undefined),
    );
    const idempotencyKey = idempotencyKeySchema.parse(
      request.headers.get("Idempotency-Key"),
    );
    return portalRouteSuccess(
      await claimTask(user, {
        ...input,
        correlationId,
        idempotencyKey,
        taskId: taskInstanceIdSchema.parse(id),
      }),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
