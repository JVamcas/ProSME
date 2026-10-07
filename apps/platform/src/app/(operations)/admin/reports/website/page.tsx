import { getAuthenticatedPageUser } from "@/platform/auth/ServerAuthNavigation";
import { getWebsiteReportsPageContext } from "@/modules/reporting/ServerWebsiteReportService";
import { WebsiteReportsWorkspace } from "@/modules/reporting/ui/reports/WebsiteReportsWorkspace";

export default async function WebsiteReportsPage() {
  const user = await getAuthenticatedPageUser();
  return <WebsiteReportsWorkspace {...getWebsiteReportsPageContext(user)} />;
}
