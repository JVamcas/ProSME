import { FileCode2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/auth/authorization/current-user";
import { permissionCodes } from "@/auth/authorization/permissions";
import { can } from "@/auth/authorization/policy";
import { NotificationTemplateWorkspace } from "@/modules/notifications/ui/NotificationTemplateWorkspace";
import { PageShell } from "@/shared/ui/PageShell";

export const metadata: Metadata = { title: "Notification template" };

export default async function NotificationTemplatePage({
  params,
}: {
  params: Promise<{ channelCode: string; targetId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || !can(user, permissionCodes.notificationConfigurationRead)) {
    redirect("/unauthorized");
  }
  const { channelCode, targetId } = await params;
  return (
    <PageShell
      backLink={(
        <Link href={`/admin/notifications/channels/${channelCode}`}>
          ← {channelCode} targets
        </Link>
      )}
      description="Import validated drafts and explicitly publish one immutable version."
      eyebrow="Notification template"
      icon={<FileCode2 />}
      title="Template versions"
    >
      <NotificationTemplateWorkspace
        canImport={can(user, permissionCodes.notificationTemplateImport)}
        canPublish={can(user, permissionCodes.notificationTemplatePublish)}
        channelCode={channelCode}
        targetId={targetId}
      />
    </PageShell>
  );
}
