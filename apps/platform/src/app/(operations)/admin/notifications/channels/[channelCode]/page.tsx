import { Mail } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/auth/authorization/current-user";
import { permissionCodes } from "@/auth/authorization/permissions";
import { can } from "@/auth/authorization/policy";
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
  return (
    <PageShell
      backLink={<Link href="/admin/notifications/channels">← Channels</Link>}
      description="Global, catalog, and event targets resolve in deterministic fallback order."
      eyebrow="Notification channel"
      icon={<Mail />}
      title={channelCode}
    >
      <NotificationChannelWorkspace channelCode={channelCode} />
    </PageShell>
  );
}
