import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { createWorkflowSchema } from "@/modules/workflows/WorkflowSchemas";
import {
  createWorkflow,
  getWorkflowDefinitions,
} from "@/modules/workflows/ServerWorkflowService";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    return portalRouteSuccess(
      await getWorkflowDefinitions(user),
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
    const input = createWorkflowSchema.parse(
      await request.json().catch(() => undefined),
    );
    return portalRouteSuccess(
      await createWorkflow(user, input, correlationId),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
