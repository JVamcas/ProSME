import { z } from "zod";

import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { getWorkflowActionAvailability } from "@/modules/workflows/application/runtime/ServerWorkflowActionAvailabilityService";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const correlationId = createCorrelationId();
  try {
    const [user, params] = await Promise.all([
      resolveUserFromHeaders(request.headers),
      context.params,
    ]);
    const query = new URL(request.url).searchParams;
    const taskId = query.get("taskId");
    return portalRouteSuccess(
      await getWorkflowActionAvailability(user, {
        sourceStageInstanceId: z.uuid().parse(
          query.get("sourceStageInstanceId"),
        ),
        ...(taskId ? { taskId: z.uuid().parse(taskId) } : {}),
        workflowInstanceId: z.uuid().parse(params.id),
      }),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
