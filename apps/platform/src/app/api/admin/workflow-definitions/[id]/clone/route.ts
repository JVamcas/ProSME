import { z } from "zod";

import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { cloneWorkflow } from "@/modules/workflows/application/definitions/ServerWorkflowLifecycleService";

const cloneSchema = z.object({ sourceVersionId: z.string().uuid() });
type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    const input = cloneSchema.parse(
      await request.json().catch(() => undefined),
    );
    const { id } = await context.params;
    return portalRouteSuccess(
      await cloneWorkflow(user, id, input.sourceVersionId, correlationId),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
