import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { workflowTemplateDetailsSchema } from "@/modules/workflows/api/WorkflowTemplateSchemas";
import {
  createWorkflowTemplate,
  getWorkflowTemplates,
} from "@/modules/workflows/application/definitions/ServerWorkflowTemplateService";

export async function GET(request: Request) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    return portalRouteSuccess(await getWorkflowTemplates(user), correlationId);
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}

export async function POST(request: Request) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    const input = workflowTemplateDetailsSchema.parse(
      await request.json().catch(() => undefined),
    );
    const created = await createWorkflowTemplate(user, input, correlationId);
    return portalRouteSuccess(
      {
        id: created.template.id,
        ...created.version.metadata,
        currentVersion: {
          id: created.version.id,
          number: created.version.versionNumber,
          status: created.version.status,
        },
        updatedAt: created.version.updatedAt.toISOString(),
      },
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
