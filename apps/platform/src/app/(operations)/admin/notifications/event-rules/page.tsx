import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAuthenticatedPageUser } from "@/platform/auth/ServerAuthNavigation";
import { permissionCodes } from "@/auth/authorization/permissions";
import { can } from "@/auth/authorization/policy";
import { NotificationRuleList } from "@/modules/notifications/ui/NotificationRuleList";
import { PageShell } from "@/shared/ui/PageShell";

export const metadata: Metadata = { title: "Notification event rules" };

export default async function NotificationEventRulesPage({
  searchParams,
}: {
  searchParams: Promise<{ reportId?: string }>;
}) {
  const { reportId } = await searchParams;
  const user = await getAuthenticatedPageUser();
  if (!user || !can(user, permissionCodes.notificationConfigurationRead)) {
    redirect("/unauthorized");
  }
  return (
    <PageShell
      description="Event rules configure notification subscriptions for application, workflow and report lifecycle events. Each rule determines who must be notified and through which enabled channels."
      eyebrow="System notification"
      title="Event Rules"
    >
      <NotificationRuleList
        canUpdateReports={can(user, permissionCodes.reportingDeliveryUpdateAll)}
        reportId={reportId}
        canUpdate={can(user, permissionCodes.notificationConfigurationUpdate)}
      />
    </PageShell>
  );
}
