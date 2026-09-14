import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { updateWorkflowDraftSchema } from "@/modules/workflows/WorkflowSchemas";
import {
  getWorkflowEditor,
  updateWorkflowDraft,
} from "@/modules/workflows/ServerWorkflowService";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    const { id } = await context.params;
    return portalRouteSuccess(await getWorkflowEditor(user, id), correlationId);
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    const input = updateWorkflowDraftSchema.parse(
      await request.json().catch(() => undefined),
    );
    const { id } = await context.params;
    return portalRouteSuccess(
      await updateWorkflowDraft(user, id, input, correlationId),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
