import { getAuthenticatedPageUser } from "@/platform/auth/ServerAuthNavigation";
import { getReportingPagePermissions } from "@/modules/reporting/ServerReportNavigationService";
import { ReportDetailWorkspace } from "@/modules/reporting/ui/reports/ReportDetailWorkspace";
export default async function Page({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const user = await getAuthenticatedPageUser();
  const { reportId } = await params;
  return (
    <ReportDetailWorkspace
      id={reportId}
      permissions={getReportingPagePermissions(user, "reports")}
    />
  );
}
