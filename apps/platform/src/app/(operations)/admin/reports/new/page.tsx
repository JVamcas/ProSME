import { getAuthenticatedPageUser } from "@/platform/auth/ServerAuthNavigation";
import { getReportingPagePermissions } from "@/modules/reporting/ServerReportNavigationService";
import Link from "next/link";
import { PageShell } from "@/shared/ui/PageShell";
import { ReportConfigurationForm } from "@/modules/reporting/ui/reports/ReportConfigurationForm";
export default async function Page() {
  const user = await getAuthenticatedPageUser();
  getReportingPagePermissions(user, "report-create");
  return (
    <PageShell
      title="Create report"
      backLink={<Link href="/admin/reports">Reports</Link>}
    >
      <ReportConfigurationForm />
    </PageShell>
  );
}
