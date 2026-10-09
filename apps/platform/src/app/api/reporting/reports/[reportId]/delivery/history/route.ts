import { getReportDeliveryHistory } from "@/modules/reporting/ServerReportDeliveryService";
import { reportRoute } from "@/modules/reporting/api/ReportRouteTransport";
type Context = { params: Promise<{ reportId: string }> };
export async function GET(request: Request, context: Context) {
  const { reportId } = await context.params;
  const values = Object.fromEntries(new URL(request.url).searchParams);
  return reportRoute(request, (user) =>
    getReportDeliveryHistory(user, reportId, values),
  );
}
