import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { authorizationAuditListSchema } from "@/modules/users/UserAccessSchemas";
import { getAuthorizationAudit } from "@/modules/users/ServerUserAccessService";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    const input = authorizationAuditListSchema.parse(
      Object.fromEntries(new URL(request.url).searchParams.entries()),
    );
    return portalRouteSuccess(
      await getAuthorizationAudit(user, input),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
