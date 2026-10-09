import { getAuthenticatedPageUser } from "@/platform/auth/ServerAuthNavigation";
import { getReportingPagePermissions } from "@/modules/reporting/ServerReportNavigationService";
import { ReportDefinitionWorkspace } from "@/modules/reporting/ui/definitions/ReportDefinitionWorkspace";
export default async function Page() {
  const user = await getAuthenticatedPageUser();
  return (
    <ReportDefinitionWorkspace
      permissions={getReportingPagePermissions(user, "definitions")}
    />
  );
}
