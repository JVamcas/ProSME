"use client";

import { Plus } from "lucide-react";
import { GeneralButton } from "@/shared/ui/Button";
import { ActionMenu } from "@/shared/ui/ActionMenu";
import { SanitizedRichTextContent } from "@/shared/ui/SanitizedRichTextContent";
import { formatConditionGroupPreview } from "@/modules/conditions/engine/ConditionPreview";
import { conditionBuilderOperators } from "@/modules/conditions/engine/ConditionOperatorCatalogue";
import {
  actionNotificationRecipientItems,
  type WorkflowActionNotification,
} from "../../domain/actions/WorkflowActionNotification";
import type {
  WorkflowEditorView,
  WorkflowStageInput,
} from "../../domain/definitions/WorkflowTypes";
import { useWorkflowConditionFields } from "./useWorkflowConditionFields";

function recipientLabel(
  notification: WorkflowActionNotification,
  editor: WorkflowEditorView,
) {
  if (notification.recipientType === "SPECIFIC_USER") {
    return (
      editor.assignmentOptions?.users.find(
        (user) => user.id === notification.recipientId,
      )?.label ?? "Selected user unavailable"
    );
  }
  if (notification.recipientType === "SPECIFIC_ROLE") {
    return (
      editor.assignmentOptions?.roles.find(
        (role) => role.id === notification.recipientId,
      )?.label ?? "Selected role unavailable"
    );
  }
  return actionNotificationRecipientItems.find(
    (item) => item.value === notification.recipientType,
  )?.label;
}

export function WorkflowActionNotificationsList({
  editor,
  stage,
  notifications,
  canEdit,
  onAdd,
  onEdit,
  onDelete,
}: {
  editor: WorkflowEditorView;
  stage: WorkflowStageInput;
  notifications: WorkflowActionNotification[];
  canEdit: boolean;
  onAdd: () => void;
  onEdit: (value: WorkflowActionNotification) => void;
  onDelete: (id: string) => void;
}) {
  const fields = useWorkflowConditionFields(editor, stage);
  return (
    <section className="space-y-4" aria-label="Action notifications">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-brand-navy/65">
          Sent when this action succeeds.
        </p>
        {canEdit ? (
          <GeneralButton
            onClick={onAdd}
            disabled={notifications.length >= 100}
            size="compact"
          >
            <Plus aria-hidden="true" className="size-4" /> Add notification
          </GeneralButton>
        ) : null}
      </div>
      {notifications.length === 0 ? (
        <p className="rounded-xl border border-dashed border-brand-navy/20 p-5 text-sm text-brand-navy/60">
          No notifications configured for this action.
        </p>
      ) : null}
      {notifications.map((notification) => (
        <article
          key={notification.id}
          className="space-y-4 rounded-xl border border-brand-navy/15 p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <h3 className="min-w-0 break-words font-semibold text-brand-navy">
              {notification.subject}
            </h3>
            {canEdit ? (
              <ActionMenu
                label={`Actions for ${notification.subject}`}
                items={[
                  {
                    id: "edit",
                    label: "Edit",
                    onAction: () => onEdit(notification),
                  },
                  {
                    id: "delete",
                    label: "Delete",
                    destructive: true,
                    onAction: () => onDelete(notification.id),
                  },
                ]}
              />
            ) : null}
          </div>
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
            <dt className="text-brand-navy/60">Recipient</dt>
            <dd className="text-brand-navy">
              {recipientLabel(notification, editor)}
            </dd>
            <dt className="text-brand-navy/60">Condition</dt>
            <dd className="text-brand-navy">
              {notification.condition
                ? formatConditionGroupPreview(
                    notification.condition,
                    fields.completionFields,
                    conditionBuilderOperators,
                  )
                : "Always send"}
            </dd>
          </dl>
          <SanitizedRichTextContent
            className="border-t border-brand-navy/10 pt-4 text-sm"
            sanitizedHtml={notification.body}
          />
        </article>
      ))}
    </section>
  );
}
