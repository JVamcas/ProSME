import { z } from "zod";
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { workflowTemplateDefinitionUpdateSchema } from "@/modules/workflows/api/WorkflowTemplateSchemas";
import { editWorkflowTemplateDefinition } from "@/modules/workflows/application/definitions/ServerWorkflowTemplateDefinitionService";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    const { id } = await context.params;
    const input = workflowTemplateDefinitionUpdateSchema.parse(
      await request.json().catch(() => undefined),
    );
    return portalRouteSuccess(
      await editWorkflowTemplateDefinition(
        user,
        z.uuid().parse(id),
        input,
        correlationId,
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
