import { Bell } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAuthenticatedPageUser } from "@/platform/auth/ServerAuthNavigation";
import { permissionCodes } from "@/auth/authorization/permissions";
import { can } from "@/auth/authorization/policy";
import { NotificationChannelsWorkspace } from "@/modules/notifications/ui/NotificationChannelsWorkspace";
import { PageShell } from "@/shared/ui/PageShell";

export const metadata: Metadata = { title: "Notification channels" };

export default async function NotificationChannelsPage() {
  const user = await getAuthenticatedPageUser();
  if (!user || !can(user, permissionCodes.notificationConfigurationRead)) {
    redirect("/unauthorized");
  }
  return (
    <PageShell
      description="Manage channel-owned notification templates and their publication lifecycle."
      eyebrow="Notifications"
      icon={<Bell />}
      title="Channels"
    >
      <NotificationChannelsWorkspace
        canUpdate={can(user, permissionCodes.notificationConfigurationUpdate)}
      />
    </PageShell>
  );
}
