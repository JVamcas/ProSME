import { getReportRun } from "@/modules/reporting/ServerReportService";
import { reportRoute } from "@/modules/reporting/api/ReportRouteTransport";

export async function GET(
  request: Request,
  context: { params: Promise<{ reportId: string; runId: string }> },
) {
  const { reportId, runId } = await context.params;
  return reportRoute(request, (user) => getReportRun(user, reportId, runId));
}
