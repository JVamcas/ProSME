import { Bell } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAuthenticatedPageUser } from "@/platform/auth/ServerAuthNavigation";
import { permissionCodes } from "@/auth/authorization/permissions";
import { can } from "@/auth/authorization/policy";
import { NotificationCatalogList } from "@/modules/notifications/ui/NotificationCatalogList";
import { PageShell } from "@/shared/ui/PageShell";

export const metadata: Metadata = { title: "Notification event catalogs" };

export default async function NotificationEventCatalogsPage() {
  const user = await getAuthenticatedPageUser();
  if (!user || !can(user, permissionCodes.notificationConfigurationRead)) {
    redirect("/unauthorized");
  }
  return (
    <PageShell
      description="Event catalog groups together related events."
      eyebrow="Notifications"
      icon={<Bell />}
      title="Event Catalogs"
    >
      <NotificationCatalogList />
    </PageShell>
  );
}
