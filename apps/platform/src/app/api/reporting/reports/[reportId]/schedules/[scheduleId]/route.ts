import { putReportSchedule } from "@/modules/reporting/ServerReportScheduleService";
import {
  reportRoute,
  reportBodyInput,
} from "@/modules/reporting/api/ReportRouteTransport";
type Context = { params: Promise<{ reportId: string; scheduleId: string }> };
export async function PUT(request: Request, context: Context) {
  const { reportId, scheduleId } = await context.params;
  return reportRoute(request, async (user) =>
    putReportSchedule(
      user,
      reportId,
      await reportBodyInput(request),
      scheduleId,
    ),
  );
}
