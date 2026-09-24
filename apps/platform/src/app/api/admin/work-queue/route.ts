import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalListRouteSuccess,
  portalRouteError,
} from "@/lib/api/PortalApiResponse";
import { workQueueListSchema } from "@/modules/work-queue/WorkQueueSchemas";
import { getWorkQueue } from "@/modules/work-queue/ServerWorkQueueService";



export async function GET(request: Request) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    const url = new URL(request.url);
    const input = workQueueListSchema.parse(
      Object.fromEntries(url.searchParams.entries()),
    );
    const page = await getWorkQueue(user, input);
    return portalListRouteSuccess(page.items, correlationId, {
      nextCursor: page.nextCursor,
      total: page.total,
    });
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
