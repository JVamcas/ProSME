"use client";

import { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { GeneralButton } from "@/shared/ui/Button";
import { DataTable, type DataTableColumn } from "@/shared/ui/DataTable";
import { ActionMenu } from "@/shared/ui/ActionMenu";
import { SanitizedRichTextContent } from "@/shared/ui/SanitizedRichTextContent";
import { formatConditionGroupPreview } from "@/modules/conditions/engine/ConditionPreview";
import { conditionBuilderOperators } from "@/modules/conditions/engine/ConditionOperatorCatalogue";
import {
  actionNotificationRecipientItems,
  workflowActionNotificationSchema,
  type WorkflowActionNotification,
} from "../../domain/actions/WorkflowActionNotification";
import type {
  WorkflowEditorView,
  WorkflowStageInput,
} from "../../domain/definitions/WorkflowTypes";
import type { WorkflowActionFormValues } from "./WorkflowActionFormSchema";
import { WorkflowActionNotificationDialog } from "./WorkflowActionNotificationDialog";
import { useWorkflowConditionFields } from "./useWorkflowConditionFields";

type Props = {
  editor: WorkflowEditorView;
  stage: WorkflowStageInput;
  readonly?: boolean;
};

export function WorkflowActionNotificationsStep({
  editor,
  stage,
  readonly = false,
}: Props) {
  const form = useFormContext<WorkflowActionFormValues>();
  const rows = useWatch({ control: form.control, name: "notifications" });
  const notifications = rows.map((row) =>
    workflowActionNotificationSchema.parse(row),
  );
  const [editing, setEditing] = useState<
    WorkflowActionNotification | "new" | null
  >(null);
  const fields = useWorkflowConditionFields(editor, stage);
  function change(rows: WorkflowActionNotification[]) {
    form.setValue("notifications", rows, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }
  const columns: DataTableColumn<WorkflowActionNotification>[] = [
    {
      id: "condition",
      header: "Condition",
      cell: ({ row }) =>
        row.original.condition
          ? formatConditionGroupPreview(
              row.original.condition,
              fields.completionFields,
              conditionBuilderOperators,
            )
          : "Always send",
    },
    {
      id: "recipient",
      header: "Recipient",
      cell: ({ row }) => {
        const value = row.original;
        if (value.recipientType === "SPECIFIC_USER") {
          return (
            editor.assignmentOptions?.users.find(
              (user) => user.id === value.recipientId,
            )?.label ?? "Selected user unavailable"
          );
        }
        if (value.recipientType === "SPECIFIC_ROLE") {
          return (
            editor.assignmentOptions?.roles.find(
              (role) => role.id === value.recipientId,
            )?.label ?? "Selected role unavailable"
          );
        }
        return actionNotificationRecipientItems.find(
          (item) => item.value === value.recipientType,
        )?.label;
      },
    },
    { accessorKey: "subject", header: "Subject" },
    {
      id: "body",
      header: "Body",
      cell: ({ row }) => (
        <SanitizedRichTextContent
          className="line-clamp-3"
          sanitizedHtml={row.original.body}
        />
      ),
    },
  ];
  if (!readonly) {
    columns.push({
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => (
        <ActionMenu
          label={`Actions for ${row.original.subject}`}
          items={[
            {
              id: "edit",
              label: "Edit",
              onAction: () => setEditing(row.original),
            },
            {
              id: "delete",
              label: "Delete",
              destructive: true,
              onAction: () =>
                change(
                  notifications.filter((item) => item.id !== row.original.id),
                ),
            },
          ]}
        />
      ),
    });
  }
  return (
    <section className="space-y-4" aria-label="Action notifications">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-brand-navy">
            Notifications ({notifications.length})
          </h3>
          <p className="text-sm text-brand-navy/60">
            Every matching notification sends when this action succeeds.
          </p>
        </div>
        {!readonly ? (
          <GeneralButton
            type="button"
            onClick={() => setEditing("new")}
            disabled={notifications.length >= 100}
          >
            Add notification
          </GeneralButton>
        ) : null}
      </div>
      <DataTable
        columns={columns}
        data={notifications}
        emptyMessage="No notifications configured for this action."
        minWidth={700}
      />
      {editing ? (
        <WorkflowActionNotificationDialog
          editor={editor}
          stage={stage}
          value={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          onSave={(value) => {
            change(
              editing === "new"
                ? [...notifications, value]
                : notifications.map((row) =>
                    row.id === value.id ? value : row,
                  ),
            );
            setEditing(null);
          }}
        />
      ) : null}
    </section>
  );
}
