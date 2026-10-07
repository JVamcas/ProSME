import { getAuthenticatedPageUser } from "@/platform/auth/ServerAuthNavigation";
import { getWebsiteReportsPageContext } from "@/modules/reporting/ServerWebsiteReportService";
import { websiteReportIdSchema } from "@/modules/reporting/api/WebsiteReportSchemas";
import { WebsiteReportDetailWorkspace } from "@/modules/reporting/ui/reports/WebsiteReportDetailWorkspace";

export default async function WebsiteReportDetailPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const user = await getAuthenticatedPageUser();
  getWebsiteReportsPageContext(user);
  const { reportId } = await params;
  return (
    <WebsiteReportDetailWorkspace
      reportId={websiteReportIdSchema.parse(reportId)}
    />
  );
}
