import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalListRouteSuccess,
  portalRouteError,
} from "@/lib/api/PortalApiResponse";
import { getAssignmentHistory } from "@/modules/workflows/application/runtime/ServerWorkflowAssignmentHistoryService";
import { taskInstanceIdSchema } from "@/modules/work-queue/WorkQueueSchemas";
import { z } from "zod";

const querySchema = z.object({
  after: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    const { id } = await context.params;
    const input = querySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams.entries()),
    );
    const page = await getAssignmentHistory(
      user,
      taskInstanceIdSchema.parse(id),
      input,
    );
    return portalListRouteSuccess(page.items, correlationId, {
      nextCursor: page.nextAfter === null ? null : String(page.nextAfter),
      total: page.total,
    });
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
