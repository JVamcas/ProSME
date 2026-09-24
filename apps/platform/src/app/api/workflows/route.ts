import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { workflowTemplateDetailsSchema, workflowTemplatePageSchema } from "@/modules/workflows/api/WorkflowTemplateSchemas";
import {
  createWorkflowTemplate,
  getWorkflowTemplates,
} from "@/modules/workflows/application/definitions/ServerWorkflowTemplateService";

export async function GET(request: Request) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    const { page, pageSize } = workflowTemplatePageSchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return portalRouteSuccess(
      await getWorkflowTemplates(user, page, pageSize),
      correlationId,
    );
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
        isLatest: true,
        ...created.version.metadata,
        currentVersion: {
          id: created.version.id,
          number: created.version.versionNumber,
          rowVersion: created.version.rowVersion,
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
