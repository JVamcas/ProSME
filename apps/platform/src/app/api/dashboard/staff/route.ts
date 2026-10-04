import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { getAdminDashboard } from "@/modules/dashboard/ServerAdminDashboardService";
import { dashboardRequestSchema } from "@/modules/dashboard/api/DashboardSchemas";

export async function GET(request: Request) {
  const correlationId = createCorrelationId();
  try {
    const { period } = dashboardRequestSchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    const user = await resolveUserFromHeaders(request.headers);
    const dashboard = await getAdminDashboard(user, period);
    return portalRouteSuccess(dashboard, correlationId);
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
