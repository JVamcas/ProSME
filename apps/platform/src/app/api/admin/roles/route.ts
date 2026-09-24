import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { getUserAccessView } from "@/modules/users/ServerUserAccessService";
import { authorizationAuditListSchema, listUsersSchema } from "@/modules/users/UserAccessSchemas";



export async function GET(request: Request) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    const params = Object.fromEntries(new URL(request.url).searchParams.entries());
    const view = await getUserAccessView(
      user,
      listUsersSchema.parse(params),
      authorizationAuditListSchema.parse(params),
    );
    return portalRouteSuccess(
      { capabilities: view.capabilities, roles: view.roles },
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
