import { z } from "zod";

import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { workflowActionExecutionRequestSchema } from "@/modules/workflows/domain/actions/WorkflowActionExecution";
import { executeWorkflowAction } from "@/modules/workflows/application/runtime/ServerWorkflowActionExecutionService";

const actionKeySchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[A-Z][A-Z0-9_]*$/);

type RouteContext = {
  params: Promise<{ actionKey: string; id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const correlationId = createCorrelationId();
  try {
    const [user, params, body] = await Promise.all([
      resolveUserFromHeaders(request.headers),
      context.params,
      request.json().catch(() => undefined),
    ]);
    const input = workflowActionExecutionRequestSchema.parse(body);
    return portalRouteSuccess(
      await executeWorkflowAction(user, {
        ...input,
        actionKey: actionKeySchema.parse(params.actionKey),
        correlationId,
        idempotencyKey: z.uuid().parse(
          request.headers.get("Idempotency-Key"),
        ),
        workflowInstanceId: z.uuid().parse(params.id),
      }),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
