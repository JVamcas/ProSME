import { retryReportDelivery } from "@/modules/reporting/ServerReportDeliveryService";
import {
  reportRoute,
  reportBodyInput,
} from "@/modules/reporting/api/ReportRouteTransport";
type Context = { params: Promise<{ reportId: string; deliveryId: string }> };
export async function POST(request: Request, context: Context) {
  const { reportId, deliveryId } = await context.params;
  return reportRoute(request, async (user) =>
    retryReportDelivery(
      user,
      reportId,
      deliveryId,
      await reportBodyInput(request),
    ),
  );
}
