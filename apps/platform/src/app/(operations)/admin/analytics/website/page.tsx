import { getAuthenticatedPageUser } from "@/platform/auth/ServerAuthNavigation";
import { getWebsiteAnalyticsPageContext } from "@/modules/reporting/application/ServerReportingService";
import { WebsiteAnalyticsWorkspace } from "@/modules/reporting/ui/website/WebsiteAnalyticsWorkspace";

export default async function WebsiteAnalyticsPage() {
  const user = await getAuthenticatedPageUser();
  const context = await getWebsiteAnalyticsPageContext(user);
  return <WebsiteAnalyticsWorkspace {...context} />;
}
