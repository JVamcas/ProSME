import { z } from "zod";
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { workflowTemplateCopySchema } from "@/modules/workflows/api/WorkflowTemplateSchemas";
import { copyWorkflowTemplate } from "@/modules/workflows/application/definitions/ServerWorkflowTemplateDefinitionService";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    const { id } = await context.params;
    const input = workflowTemplateCopySchema.parse(
      await request.json().catch(() => undefined),
    );
    return portalRouteSuccess(
      await copyWorkflowTemplate(
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
