import { getPublishedReportTemplate } from "@/modules/reporting/ServerReportDefinitionService";
import { reportRoute } from "@/modules/reporting/api/ReportRouteTransport";

export async function GET(
  request: Request,
  context: { params: Promise<{ templateId: string; version: string }> },
) {
  const { templateId, version } = await context.params;
  return reportRoute(request, (user) =>
    getPublishedReportTemplate(user, templateId, Number(version)),
  );
}
