import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { workflowEditorVersionIdSchema } from "@/modules/workflows/api/WorkflowSchemas";
import { validateWorkflow } from "@/modules/workflows/application/definitions/ServerWorkflowService";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    const { id } = await context.params;
    const versionId = workflowEditorVersionIdSchema.parse(
      new URL(request.url).searchParams.get("versionId") ?? undefined,
    );
    return portalRouteSuccess(
      await validateWorkflow(user, id, versionId),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
