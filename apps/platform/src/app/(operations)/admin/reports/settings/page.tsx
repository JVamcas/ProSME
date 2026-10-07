import { getAuthenticatedPageUser } from "@/platform/auth/ServerAuthNavigation";
import { getWebsiteReportSettingsPageContext } from "@/modules/reporting/ServerWebsiteReportService";
import { WebsiteReportSettingsWorkspace } from "@/modules/reporting/ui/reports/WebsiteReportSettingsWorkspace";

export default async function WebsiteReportSettingsPage() {
  const user = await getAuthenticatedPageUser();
  return (
    <WebsiteReportSettingsWorkspace
      {...getWebsiteReportSettingsPageContext(user)}
    />
  );
}
