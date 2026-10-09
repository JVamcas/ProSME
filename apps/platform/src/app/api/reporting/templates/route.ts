import {
  getReportTemplates,
  putReportTemplate,
} from "@/modules/reporting/ServerReportDefinitionService";
import {
  reportBodyInput,
  reportRoute,
  reportListInput,
} from "@/modules/reporting/api/ReportRouteTransport";

export async function GET(request: Request) {
  return reportRoute(request, (user) =>
    getReportTemplates(user, reportListInput(request)),
  );
}
export async function POST(request: Request) {
  return reportRoute(request, async (user) =>
    putReportTemplate(user, await reportBodyInput(request)),
  );
}
