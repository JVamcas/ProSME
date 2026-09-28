import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/auth/authorization/current-user";
import { permissionCodes } from "@/auth/authorization/permissions";
import { can } from "@/auth/authorization/policy";
import {
  notificationChannelCodeSchema,
  notificationTemplateTargetIdSchema,
} from "@/modules/notifications/api/NotificationTemplateSchemas";
import { getNotificationTemplateTarget } from "@/modules/notifications/application/ServerNotificationTemplateService";
import { NotificationTemplateImportAction } from "@/modules/notifications/ui/NotificationTemplateImportAction";
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
  const routeParams = await params;
  const channelCode = notificationChannelCodeSchema.parse(routeParams.channelCode);
  const targetId = notificationTemplateTargetIdSchema.parse(routeParams.targetId);
  const detail = await getNotificationTemplateTarget(user, channelCode, targetId);
  return (
    <PageShell
      actions={can(user, permissionCodes.notificationTemplateImport) ? (
        <NotificationTemplateImportAction
          channelCode={channelCode}
          defaultSubjectTemplate={detail.target.defaultSubjectTemplate}
          targetId={targetId}
        />
      ) : undefined}
      backLink={(
        <Link href={`/admin/notifications/channels/${channelCode}`}>
          ← Back to channel
        </Link>
      )}
      description={`Manage draft, published, and retired versions for this ${detail.channelCode.toLowerCase()} notification template target.`}
      eyebrow="Notification templates"
      title={detail.target.label}
    >
      <NotificationTemplateWorkspace
        canPublish={can(user, permissionCodes.notificationTemplatePublish)}
        channelCode={channelCode}
        initialData={detail}
        targetId={targetId}
      />
    </PageShell>
  );
}
