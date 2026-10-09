import { getReportDeliveryOverview } from "@/modules/reporting/ServerReportDeliveryService";
import { reportRoute } from "@/modules/reporting/api/ReportRouteTransport";
type Context = { params: Promise<{ reportId: string }> };
export async function GET(request: Request, context: Context) {
  const { reportId } = await context.params;
  return reportRoute(request, (user) =>
    getReportDeliveryOverview(user, reportId),
  );
}
