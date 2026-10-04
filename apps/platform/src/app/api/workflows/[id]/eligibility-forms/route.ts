import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { workflowEligibilityPreviewQuerySchema } from "@/modules/workflows/api/WorkflowEligibilityFormPreview";
import { getWorkflowEligibilityFormPreviews } from "@/modules/workflows/application/definitions/ServerWorkflowEligibilityPreviewService";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    const { id } = await context.params;
    const input = workflowEligibilityPreviewQuerySchema.parse({
      definitionId: id,
      versionId: new URL(request.url).searchParams.get("versionId"),
    });
    return portalRouteSuccess(
      await getWorkflowEligibilityFormPreviews(user, input.definitionId, input.versionId),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
