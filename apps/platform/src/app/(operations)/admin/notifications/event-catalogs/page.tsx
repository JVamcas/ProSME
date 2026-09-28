import { Bell } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/auth/authorization/current-user";
import { permissionCodes } from "@/auth/authorization/permissions";
import { can } from "@/auth/authorization/policy";
import { NotificationCatalogList } from "@/modules/notifications/ui/NotificationCatalogList";
import { PageShell } from "@/shared/ui/PageShell";

export const metadata: Metadata = { title: "Notification event catalogs" };

export default async function NotificationEventCatalogsPage() {
  const user = await getCurrentUser();
  if (!user || !can(user, permissionCodes.notificationConfigurationRead)) {
    redirect("/unauthorized");
  }
  return (
    <PageShell
      description="Control catalog presentation and availability. Event membership remains fixed."
      eyebrow="Notifications"
      icon={<Bell />}
      title="Event Catalogs"
    >
      <NotificationCatalogList />
    </PageShell>
  );
}
