import { Bell } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuthenticatedPageUser } from "@/platform/auth/ServerAuthNavigation";
import { permissionCodes } from "@/auth/authorization/permissions";
import { can } from "@/auth/authorization/policy";
import { NotificationRuleEditor } from "@/modules/notifications/ui/NotificationRuleEditor";
import { PageShell } from "@/shared/ui/PageShell";

export const metadata: Metadata = { title: "Edit notification event rule" };

export default async function NotificationEventRulePage({
  params,
}: {
  params: Promise<{ eventKey: string }>;
}) {
  const user = await getAuthenticatedPageUser();
  if (!user || !can(user, permissionCodes.notificationConfigurationRead)) {
    redirect("/unauthorized");
  }
  const { eventKey } = await params;
  const key = decodeURIComponent(eventKey);
  return (
    <PageShell
      backLink={(
        <Link
          className="text-sm font-semibold text-brand-orange"
          href="/admin/notifications/event-rules"
        >
          ← Event Rules
        </Link>
      )}
      description="Update enabled state, required recipients, and channel bindings as one atomic rule change."
      eyebrow="Notifications"
      icon={<Bell />}
      title={key}
    >
      <NotificationRuleEditor
        canUpdate={can(user, permissionCodes.notificationConfigurationUpdate)}
        eventKey={key}
      />
    </PageShell>
  );
}
