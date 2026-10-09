import {
  getReportRuns,
  runReport,
} from "@/modules/reporting/ServerReportService";
import {
  reportBodyInput,
  reportRoute,
  reportListInput,
} from "@/modules/reporting/api/ReportRouteTransport";

type Context = { params: Promise<{ reportId: string }> };
export async function GET(request: Request, context: Context) {
  const { reportId } = await context.params;
  return reportRoute(request, (user) =>
    getReportRuns(user, reportId, reportListInput(request)),
  );
}
export async function POST(request: Request, context: Context) {
  const { reportId } = await context.params;
  return reportRoute(request, async (user) =>
    runReport(user, reportId, await reportBodyInput(request)),
  );
}
