import { checkReportTemplate } from "@/modules/reporting/ServerReportDefinitionService";
import {
  reportBodyInput,
  reportRoute,
} from "@/modules/reporting/api/ReportRouteTransport";

export async function POST(
  request: Request,
  context: { params: Promise<{ templateId: string }> },
) {
  const { templateId } = await context.params;
  return reportRoute(request, async (user) =>
    checkReportTemplate(user, templateId, await reportBodyInput(request), true),
  );
}
