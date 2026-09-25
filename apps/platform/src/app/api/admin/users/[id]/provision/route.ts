import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { provisionUnprovisionedUser } from "@/modules/users/ServerUserProvisioningService";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const correlationId = createCorrelationId();

  try {
    const actor = await resolveUserFromHeaders(request.headers);
    const { id } = await context.params;
    const user = await provisionUnprovisionedUser(actor, id);
    return portalRouteSuccess(user, correlationId);
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
