import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { promoteUserSchema } from "@/modules/users/UserAccessSchemas";
import { promoteUser } from "@/modules/users/ServerUserAccessService";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    const { id } = await context.params;
    const input = promoteUserSchema.parse(
      await request.json().catch(() => undefined),
    );
    return portalRouteSuccess(
      await promoteUser(user, id, input.roleCodes),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
