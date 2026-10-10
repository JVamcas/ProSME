import { z } from "zod";
import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { workflowTemplatePageSchema } from "@/modules/workflows/api/WorkflowTemplateSchemas";
import { getWorkflowTemplateVersionPage } from "@/modules/workflows/application/definitions/ServerWorkflowTemplateService";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    const { id } = await context.params;
    const { page, pageSize } = workflowTemplatePageSchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return portalRouteSuccess(
      await getWorkflowTemplateVersionPage(
        user,
        z.uuid().parse(id),
        page,
        pageSize,
      ),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
