import { z } from "zod";

import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { getTaskWorkflowRfi } from "@/modules/workflows/application/runtime/ServerWorkflowRfiReadService";

const parametersSchema = z.object({
  id: z.uuid(),
  requestId: z.uuid(),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string; requestId: string }> },
) {
  const correlationId = createCorrelationId();
  try {
    const [user, parameters] = await Promise.all([
      resolveUserFromHeaders(request.headers),
      context.params.then((value) => parametersSchema.parse(value)),
    ]);
    return portalRouteSuccess(
      await getTaskWorkflowRfi(user, parameters.id, parameters.requestId),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
