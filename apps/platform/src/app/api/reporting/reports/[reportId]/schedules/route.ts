import {
  getReportSchedules,
  putReportSchedule,
} from "@/modules/reporting/ServerReportScheduleService";
import {
  reportRoute,
  reportBodyInput,
} from "@/modules/reporting/api/ReportRouteTransport";
type Context = { params: Promise<{ reportId: string }> };
export async function GET(request: Request, context: Context) {
  const { reportId } = await context.params;
  return reportRoute(request, (user) => getReportSchedules(user, reportId));
}
export async function POST(request: Request, context: Context) {
  const { reportId } = await context.params;
  return reportRoute(request, async (user) =>
    putReportSchedule(user, reportId, await reportBodyInput(request)),
  );
}
