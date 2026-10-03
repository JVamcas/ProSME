import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAuthenticatedPageUser } from "@/platform/auth/ServerAuthNavigation";
import { permissionCodes } from "@/auth/authorization/permissions";
import { can } from "@/auth/authorization/policy";
import { NotificationRuleList } from "@/modules/notifications/ui/NotificationRuleList";
import { PageShell } from "@/shared/ui/PageShell";

export const metadata: Metadata = { title: "Notification event rules" };

export default async function NotificationEventRulesPage() {
  const user = await getAuthenticatedPageUser();
  if (!user || !can(user, permissionCodes.notificationConfigurationRead)) {
    redirect("/unauthorized");
  }
  return (
    <PageShell
      description="Event rules define the mandatory notifications generated when an application or workflow event occurs. Each rule determines who must be notified and through which enabled channels."
      eyebrow="System notification"
      title="Event Rules"
    >
      <NotificationRuleList
        canUpdate={can(user, permissionCodes.notificationConfigurationUpdate)}
      />
    </PageShell>
  );
}
