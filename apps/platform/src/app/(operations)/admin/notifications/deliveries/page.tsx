import { Bell } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/auth/authorization/current-user";
import { permissionCodes } from "@/auth/authorization/permissions";
import { can } from "@/auth/authorization/policy";
import { NotificationDeliveryHistory } from "@/modules/notifications/ui/NotificationDeliveryHistory";
import { NotificationOperationalSummary } from "@/modules/notifications/ui/NotificationOperationalSummary";
import { PageShell } from "@/shared/ui/PageShell";

export const metadata: Metadata = { title: "Notification delivery operations" };

export default async function NotificationDeliveriesPage() {
  const user = await getCurrentUser();
  if (!user || !can(user, permissionCodes.notificationDeliveryRead)) {
    redirect("/unauthorized");
  }
  return (
    <PageShell
      description="Inspect delivery outcomes, monitor processor health, and schedule eligible retries."
      eyebrow="Notifications"
      icon={<Bell />}
      title="Delivery Operations"
    >
      <NotificationOperationalSummary />
      <div className="mt-6">
        <NotificationDeliveryHistory
          canRetry={can(user, permissionCodes.notificationDeliveryRetry)}
        />
      </div>
    </PageShell>
  );
}
