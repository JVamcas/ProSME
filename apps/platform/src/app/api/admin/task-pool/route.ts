import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalListRouteSuccess,
  portalRouteError,
} from "@/lib/api/PortalApiResponse";
import { selfAssignmentPoolSchema } from "@/modules/work-queue/WorkQueueSchemas";
import { getSelfAssignmentPool } from "@/modules/work-queue/ServerWorkQueueService";

export async function GET(request: Request) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    const input = selfAssignmentPoolSchema.parse(
      Object.fromEntries(new URL(request.url).searchParams.entries()),
    );
    const page = await getSelfAssignmentPool(user, input);
    return portalListRouteSuccess(page.items, correlationId, {
      nextCursor: page.nextCursor,
      total: page.total,
    });
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
