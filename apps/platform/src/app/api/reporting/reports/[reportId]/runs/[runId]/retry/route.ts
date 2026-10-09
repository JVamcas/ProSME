import { retryReportRun } from "@/modules/reporting/ServerReportService";
import {
  reportRoute,
  reportBodyInput,
} from "@/modules/reporting/api/ReportRouteTransport";
type Context = { params: Promise<{ reportId: string; runId: string }> };
export async function POST(request: Request, context: Context) {
  const { reportId, runId } = await context.params;
  return reportRoute(request, async (user) =>
    retryReportRun(user, reportId, runId, await reportBodyInput(request)),
  );
}
