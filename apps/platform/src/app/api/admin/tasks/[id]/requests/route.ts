import { z } from "zod";

import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { listTaskWorkflowRfis } from "@/modules/workflows/application/runtime/ServerWorkflowRfiReadService";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const correlationId = createCorrelationId();
  try {
    const [user, parameters] = await Promise.all([
      resolveUserFromHeaders(request.headers),
      context.params,
    ]);
    return portalRouteSuccess(
      await listTaskWorkflowRfis(user, z.uuid().parse(parameters.id)),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
