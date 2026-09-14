import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { workflowCommandSchema } from "@/modules/workflows/WorkflowSchemas";
import { publishWorkflow } from "@/modules/workflows/ServerWorkflowLifecycleService";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    const input = workflowCommandSchema.parse(
      await request.json().catch(() => undefined),
    );
    const { id } = await context.params;
    const result = await publishWorkflow(
      user,
      id,
      input.versionId,
      input.expectedRowVersion,
      request.headers.get("Idempotency-Key"),
      correlationId,
    );
    return portalRouteSuccess(result, correlationId);
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
