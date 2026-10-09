import { getReport, putReport } from "@/modules/reporting/ServerReportService";
import {
  reportBodyInput,
  reportRoute,
} from "@/modules/reporting/api/ReportRouteTransport";

type Context = { params: Promise<{ reportId: string }> };
export async function GET(request: Request, context: Context) {
  const { reportId } = await context.params;
  return reportRoute(request, (user) => getReport(user, reportId));
}
export async function PUT(request: Request, context: Context) {
  const { reportId } = await context.params;
  return reportRoute(request, async (user) =>
    putReport(user, await reportBodyInput(request), reportId),
  );
}
