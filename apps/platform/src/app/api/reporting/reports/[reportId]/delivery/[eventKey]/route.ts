import { putReportDelivery } from "@/modules/reporting/ServerReportDeliveryService";
import {
  reportRoute,
  reportBodyInput,
} from "@/modules/reporting/api/ReportRouteTransport";
type Context = { params: Promise<{ reportId: string; eventKey: string }> };
export async function PUT(request: Request, context: Context) {
  const { reportId, eventKey } = await context.params;
  return reportRoute(request, async (user) =>
    putReportDelivery(user, reportId, eventKey, await reportBodyInput(request)),
  );
}
