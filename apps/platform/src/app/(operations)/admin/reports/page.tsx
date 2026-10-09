import { getAuthenticatedPageUser } from "@/platform/auth/ServerAuthNavigation";
import { getReportingPagePermissions } from "@/modules/reporting/ServerReportNavigationService";
import { ReportCatalogue } from "@/modules/reporting/ui/reports/ReportCatalogue";
export default async function Page() {
  const user = await getAuthenticatedPageUser();
  return (
    <ReportCatalogue
      permissions={getReportingPagePermissions(user, "reports")}
    />
  );
}
