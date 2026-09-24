import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { updateWorkflowDetailsSchema } from "@/modules/workflows/api/WorkflowSchemas";
import { workflowCommandSchema } from "@/modules/workflows/api/WorkflowSchemas";
import {
  updateWorkflowDetails,
} from "@/modules/workflows/application/definitions/ServerWorkflowService";
import { deleteWorkflowTemplate } from "@/modules/workflows/application/definitions/ServerWorkflowTemplateService";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    const input = updateWorkflowDetailsSchema.parse(
      await request.json().catch(() => undefined),
    );
    const { id } = await context.params;
    return portalRouteSuccess(
      await updateWorkflowDetails(user, id, input, correlationId),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    const input = workflowCommandSchema.parse(
      await request.json().catch(() => undefined),
    );
    const { id } = await context.params;
    return portalRouteSuccess(
      await deleteWorkflowTemplate(
        user,
        id,
        input.versionId,
        input.expectedRowVersion,
        correlationId,
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
