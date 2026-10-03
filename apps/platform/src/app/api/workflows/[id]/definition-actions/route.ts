import { z } from "zod";

import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { workflowActionDeletionSchema } from "@/modules/workflows/api/WorkflowActionDeletionSchema";
import { deleteWorkflowAction } from "@/modules/workflows/application/definitions/ServerWorkflowActionDeletionService";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, context: RouteContext) {
  const correlationId = createCorrelationId();
  try {
    const [user, params, body] = await Promise.all([
      resolveUserFromHeaders(request.headers),
      context.params,
      request.json().catch(() => undefined),
    ]);
    const input = workflowActionDeletionSchema.parse(body);
    return portalRouteSuccess(
      await deleteWorkflowAction(
        user,
        z.uuid().parse(params.id),
        input,
        correlationId,
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
