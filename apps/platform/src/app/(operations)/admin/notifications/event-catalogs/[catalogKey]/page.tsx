import { Bell } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/auth/authorization/current-user";
import { permissionCodes } from "@/auth/authorization/permissions";
import { can } from "@/auth/authorization/policy";
import { NotificationCatalogEditor } from "@/modules/notifications/ui/NotificationCatalogEditor";
import { PageShell } from "@/shared/ui/PageShell";

export const metadata: Metadata = { title: "Edit notification event catalog" };

export default async function NotificationEventCatalogPage({
  params,
}: {
  params: Promise<{ catalogKey: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || !can(user, permissionCodes.notificationConfigurationRead)) {
    redirect("/unauthorized");
  }
  const { catalogKey } = await params;
  const key = decodeURIComponent(catalogKey);
  return (
    <PageShell
      backLink={(
        <Link
          className="text-sm font-semibold text-brand-orange"
          href="/admin/notifications/event-catalogs"
        >
          ← Event Catalogs
        </Link>
      )}
      description="Edit catalog metadata and inspect immutable event membership."
      eyebrow="Notifications"
      icon={<Bell />}
      title={key}
    >
      <NotificationCatalogEditor
        canUpdate={can(user, permissionCodes.notificationConfigurationUpdate)}
        catalogKey={key}
      />
    </PageShell>
  );
}
