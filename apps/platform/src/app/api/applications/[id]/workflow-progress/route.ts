import { z } from "zod";

import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { getWorkflowProgress } from "@/modules/workflows/application/runtime/ServerWorkflowProgressService";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const correlationId = createCorrelationId();

  try {
    const user = await resolveUserFromHeaders(request.headers);
    const { id } = await context.params;
    const applicationId = z.uuid().parse(id);
    const taskId = z
      .uuid()
      .optional()
      .parse(new URL(request.url).searchParams.get("taskId") ?? undefined);

    return portalRouteSuccess(
      await getWorkflowProgress(
        user,
        applicationId,
        taskId ? { taskId } : undefined,
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
