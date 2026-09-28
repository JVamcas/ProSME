import { Bell } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/auth/authorization/current-user";
import { permissionCodes } from "@/auth/authorization/permissions";
import { can } from "@/auth/authorization/policy";
import { NotificationRuleList } from "@/modules/notifications/ui/NotificationRuleList";
import { PageShell } from "@/shared/ui/PageShell";

export const metadata: Metadata = { title: "Notification event rules" };

export default async function NotificationEventRulesPage() {
  const user = await getCurrentUser();
  if (!user || !can(user, permissionCodes.notificationConfigurationRead)) {
    redirect("/unauthorized");
  }
  return (
    <PageShell
      description="Configure recipients and delivery channels for immutable notification events."
      eyebrow="Notifications"
      icon={<Bell />}
      title="Event Rules"
    >
      <NotificationRuleList />
    </PageShell>
  );
}
