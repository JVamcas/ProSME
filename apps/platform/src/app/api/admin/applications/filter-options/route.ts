import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { getAdminApplicationFilterOptions } from "@/modules/applications/ServerAdminApplicationService";

export async function GET(request: Request) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    return portalRouteSuccess(
      await getAdminApplicationFilterOptions(user),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
