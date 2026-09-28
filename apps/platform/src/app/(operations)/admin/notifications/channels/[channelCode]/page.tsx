import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/auth/authorization/current-user";
import { permissionCodes } from "@/auth/authorization/permissions";
import { can } from "@/auth/authorization/policy";
import { NotificationChannelEditAction } from "@/modules/notifications/ui/NotificationChannelEditAction";
import { NotificationChannelWorkspace } from "@/modules/notifications/ui/NotificationChannelWorkspace";
import { PageShell } from "@/shared/ui/PageShell";

export const metadata: Metadata = { title: "Notification channel" };

export default async function NotificationChannelPage({
  params,
}: {
  params: Promise<{ channelCode: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || !can(user, permissionCodes.notificationConfigurationRead)) {
    redirect("/unauthorized");
  }
  const { channelCode } = await params;
  const channelName = channelCode === "EMAIL"
    ? "Email"
    : channelCode.replaceAll("_", " ").toLowerCase();
  return (
    <PageShell
      actions={can(user, permissionCodes.notificationConfigurationUpdate) ? (
        <NotificationChannelEditAction channelCode={channelCode} />
      ) : undefined}
      description="Published template versions resolve in this order: event specific, then event catalog fallback, then the global fallback."
      eyebrow="Notification channel"
      title={`${channelName} templates`}
    >
      <NotificationChannelWorkspace channelCode={channelCode} />
    </PageShell>
  );
}
