import { getReports, putReport } from "@/modules/reporting/ServerReportService";
import {
  reportBodyInput,
  reportRoute,
  reportListInput,
} from "@/modules/reporting/api/ReportRouteTransport";

export async function GET(request: Request) {
  return reportRoute(request, (user) =>
    getReports(user, reportListInput(request)),
  );
}
export async function POST(request: Request) {
  return reportRoute(request, async (user) =>
    putReport(user, await reportBodyInput(request)),
  );
}
