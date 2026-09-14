import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { validateWorkflow } from "@/modules/workflows/ServerWorkflowService";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    const { id } = await context.params;
    return portalRouteSuccess(await validateWorkflow(user, id), correlationId);
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
