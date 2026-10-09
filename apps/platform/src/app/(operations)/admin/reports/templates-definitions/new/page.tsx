import { getAuthenticatedPageUser } from "@/platform/auth/ServerAuthNavigation";
import { getReportingPagePermissions } from "@/modules/reporting/ServerReportNavigationService";
import { ReportTemplateEditor } from "@/modules/reporting/ui/definitions/ReportTemplateEditor";
export default async function Page() {
  const user = await getAuthenticatedPageUser();
  return (
    <ReportTemplateEditor
      permissions={getReportingPagePermissions(user, "template-create")}
    />
  );
}
