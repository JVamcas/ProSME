import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { getApplicantDashboard } from "@/modules/dashboard/ServerApplicantDashboardService";

export async function GET(request: Request) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    const dashboard = await getApplicantDashboard(user);
    return portalRouteSuccess(dashboard, correlationId);
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
