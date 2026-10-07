import { resolveUserFromHeaders } from "@/auth/authorization/current-user";
import {
  createCorrelationId,
  portalRouteError,
  portalRouteSuccess,
} from "@/lib/api/PortalApiResponse";
import { getSavedWebsiteReport } from "@/modules/reporting/ServerWebsiteReportService";

export async function GET(
  request: Request,
  context: { params: Promise<{ reportId: string }> },
) {
  const correlationId = createCorrelationId();
  try {
    const user = await resolveUserFromHeaders(request.headers);
    const { reportId } = await context.params;
    return portalRouteSuccess(
      await getSavedWebsiteReport(user, reportId),
      correlationId,
    );
  } catch (error) {
    return portalRouteError(error, correlationId);
  }
}
