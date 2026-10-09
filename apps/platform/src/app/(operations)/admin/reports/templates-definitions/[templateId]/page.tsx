import { getAuthenticatedPageUser } from "@/platform/auth/ServerAuthNavigation";
import { getReportingPagePermissions } from "@/modules/reporting/ServerReportNavigationService";
import { ReportTemplateEditor } from "@/modules/reporting/ui/definitions/ReportTemplateEditor";
export default async function Page({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const user = await getAuthenticatedPageUser();
  const { templateId } = await params;
  return (
    <ReportTemplateEditor
      id={templateId}
      permissions={getReportingPagePermissions(user, "definitions")}
    />
  );
}
