import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { updateUserSchema } from "@/modules/users/UserAccessSchemas";
import { updateUserAccess } from "@/modules/users/ServerUserAccessService";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    const { id } = await context.params;
    const input = updateUserSchema.parse(
      await request.json().catch(() => undefined),
    );
    return portalRouteSuccess(
      await updateUserAccess(user, id, input),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
