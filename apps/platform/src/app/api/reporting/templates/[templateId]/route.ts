import {
  getReportTemplate,
  putReportTemplate,
} from "@/modules/reporting/ServerReportDefinitionService";
import {
  reportBodyInput,
  reportRoute,
} from "@/modules/reporting/api/ReportRouteTransport";

type Context = { params: Promise<{ templateId: string }> };
export async function GET(request: Request, context: Context) {
  const { templateId } = await context.params;
  return reportRoute(request, (user) => getReportTemplate(user, templateId));
}
export async function PUT(request: Request, context: Context) {
  const { templateId } = await context.params;
  return reportRoute(request, async (user) =>
    putReportTemplate(user, await reportBodyInput(request), templateId),
  );
}
