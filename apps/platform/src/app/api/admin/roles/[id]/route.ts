import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { updateRoleSchema } from "@/modules/users/UserAccessSchemas";
import { updateRole } from "@/modules/users/ServerUserAccessService";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    const { id } = await context.params;
    const input = updateRoleSchema.parse(
      await request.json().catch(() => undefined),
    );
    return portalRouteSuccess(
      await updateRole(user, id, input),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
