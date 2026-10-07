"use client";
import { useState } from "react";
import { toast } from "sonner";
import {
  ActivateButton,
  DeactivateButton,
} from "@/components/ui/action-buttons";
import { notificationRuleDetailUpdateValues } from "./NotificationRuleUpdateValues";
import { GeneralButton } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/shared/ui/DataTable";
import { PortalLoadingState } from "@/shared/ui/portal/PortalLoadingState";
import { PortalErrorState } from "@/shared/ui/portal/PortalErrorState";
import type { NotificationEventRuleDetail } from "../api/NotificationAdministrationSchemas";
import { NotificationRuleRecipientsDialog } from "./NotificationRuleRecipientsDialog";
import {
  useNotificationRule,
  useUpdateNotificationRule,
} from "./useNotificationAdministration";
import { useNotificationChannels } from "./NotificationTemplateHooks";
import { notificationRecipientLabel } from "./NotificationRecipientPresentation";

type Recipient = NotificationEventRuleDetail["recipients"][number];
const columns: DataTableColumn<Recipient>[] = [
  {
    id: "recipient",
    header: "Recipient",
    enableSorting: false,
    cell: ({ row }) =>
      row.original.targetDisplayName ??
      notificationRecipientLabel(row.original.recipientType),
  },
  {
    id: "channel",
    header: "Channels",
    enableSorting: false,
    cell: ({ row }) => row.original.channelCodes.join(", "),
  },
];

export function NotificationRuleDeliveryConfiguration({
  eventKey,
  canUpdate,
}: {
  eventKey: string;
  canUpdate: boolean;
}) {
  const query = useNotificationRule(eventKey);
  const channels = useNotificationChannels();
  const mutation = useUpdateNotificationRule(eventKey);
  const [editing, setEditing] = useState(false);
  const rule = query.data;
  if (query.isPending) {
    return <PortalLoadingState title="" description="Just a moment..." />;
  }
  if (query.error || !rule) {
    return (
      <PortalErrorState
        title="Delivery recipients could not be loaded"
        description={query.error?.message ?? "Notification rule unavailable."}
        headingLevel={2}
        onAction={() => void query.refetch()}
      />
    );
  }
  const deliveryEnabled = rule.eventEnabled && rule.isEnabled;
  async function toggleDelivery() {
    if (!rule) {
      return;
    }
    try {
      await mutation.mutateAsync({
        ...notificationRuleDetailUpdateValues(rule),
        eventEnabled: !deliveryEnabled,
        isEnabled: !deliveryEnabled,
      });
      toast.success(
        deliveryEnabled
          ? "Report email delivery disabled."
          : "Report email delivery enabled.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to update report email delivery.",
      );
    }
  }
  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={rule.recipients}
        rowKey={(recipient) =>
          `${recipient.recipientType}:${recipient.targetId ?? ""}`
        }
        emptyMessage="Configure designated users or roles with saved-report access."
        toolbar={{
          title: "Delivery recipients",
          description:
            "Only active users with website-report access receive reports.",
        }}
      />
      {!rule.eventEnabled || !rule.isEnabled ? (
        <p role="status">
          Delivery is disabled in the notification event rules.
        </p>
      ) : null}
      {canUpdate ? (
        <div className="flex items-center gap-3">
          <GeneralButton variant="outline" onClick={() => setEditing(true)}>
            Configure delivery recipients
          </GeneralButton>
          {deliveryEnabled ? (
            <DeactivateButton
              disabled={mutation.isPending || !rule.recipients.length}
              onClick={() => void toggleDelivery()}
              title="Disable report email delivery"
            />
          ) : (
            <ActivateButton
              disabled={mutation.isPending || !rule.recipients.length}
              onClick={() => void toggleDelivery()}
              title="Enable report email delivery"
            />
          )}
        </div>
      ) : null}
      <NotificationRuleRecipientsDialog
        channels={channels.data ?? []}
        isPending={mutation.isPending}
        rule={editing ? rule : null}
        onClose={() => setEditing(false)}
        onSubmit={async (input) => {
          try {
            await mutation.mutateAsync(input);
            toast.success("Report delivery recipients updated.");
            setEditing(false);
          } catch (error) {
            toast.error(
              error instanceof Error
                ? error.message
                : "Unable to update report delivery recipients.",
            );
          }
        }}
      />
    </div>
  );
}
