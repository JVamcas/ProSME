import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import {
  inviteUserSchema,
  listUsersSchema,
  authorizationAuditListSchema,
} from "@/modules/users/UserAccessSchemas";
import {
  getUserAccessView,
  inviteUser,
} from "@/modules/users/ServerUserAccessService";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    const params = Object.fromEntries(new URL(request.url).searchParams.entries());
    return portalRouteSuccess(
      await getUserAccessView(
        user,
        listUsersSchema.parse(params),
        authorizationAuditListSchema.parse(params),
      ),
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
    const input = inviteUserSchema.parse(
      await request.json().catch(() => undefined),
    );
    return portalRouteSuccess(await inviteUser(user, input), correlationId);
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
