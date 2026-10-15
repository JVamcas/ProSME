"use client";

import { useId, useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { GeneralButton } from "@/shared/ui/Button";
import { RightDrawer } from "@/shared/ui/RightDrawer";
import type { WorkflowActionDefinition } from "../../domain/actions/WorkflowActionDefinition";
import {
  workflowActionNotificationSchema,
  type WorkflowActionNotification,
} from "../../domain/actions/WorkflowActionNotification";
import type {
  WorkflowEditorView,
  WorkflowStageInput,
} from "../../domain/definitions/WorkflowTypes";
import {
  workflowActionFormSchema,
  type WorkflowActionFormValues,
} from "./WorkflowActionFormSchema";
import { workflowActionRoutes } from "./WorkflowActionEditorRoutes";
import { useSaveWorkflowAction } from "./useSaveWorkflowAction";
import { WorkflowActionNotificationForm } from "./WorkflowActionNotificationForm";
import { WorkflowActionNotificationsList } from "./WorkflowActionNotificationsList";

const notificationsSchema = z.object({
  notifications: workflowActionFormSchema.shape.notifications,
});
type FormValues = Pick<WorkflowActionFormValues, "notifications">;

export function WorkflowActionNotificationsDrawer({
  action,
  editor,
  stage,
  canEdit,
  onClose,
}: {
  action: WorkflowActionDefinition;
  editor: WorkflowEditorView;
  stage: WorkflowStageInput;
  canEdit: boolean;
  onClose: () => void;
}) {
  // Keep the version that opened this draft. A concurrent workflow edit must
  // produce a version conflict rather than silently overwriting newer changes.
  const [source] = useState({ action, editor, stage });
  const mutation = useSaveWorkflowAction(source.editor);
  const formId = useId();
  const form = useForm<FormValues>({
    resolver: zodResolver(notificationsSchema),
    defaultValues: { notifications: source.action.notifications ?? [] },
  });
  const rows = useWatch({ control: form.control, name: "notifications" });
  const notifications = rows.map((row) =>
    workflowActionNotificationSchema.parse(row),
  );
  const [editing, setEditing] = useState<
    WorkflowActionNotification | "new" | null
  >(null);
  const editable = canEdit && !mutation.isPending;
  const taskNames = source.stage.tasks
    .filter((task) => task.actionKeys.includes(source.action.stableKey))
    .map((task) => task.name);

  function change(values: WorkflowActionNotification[]) {
    form.setValue("notifications", values, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  const save = form.handleSubmit(async (values) => {
    if (!editable) return;
    try {
      await mutation.mutateAsync({
        stageKey: source.stage.stableKey,
        actionKey: source.action.stableKey,
        action: {
          ...source.action,
          notifications: values.notifications.map((row) =>
            workflowActionNotificationSchema.parse(row),
          ),
        },
        taskStableKeys: source.stage.tasks
          .filter((task) => task.actionKeys.includes(source.action.stableKey))
          .map((task) => task.stableKey),
        routes: workflowActionRoutes(
          source.editor.graph.transitions,
          source.stage.stableKey,
          source.action.stableKey,
        ),
      });
      onClose();
    } catch {
      // Keep edits available in the drawer when saving fails.
    }
  });

  return (
    <RightDrawer
      open
      title={
        editing
          ? editing === "new"
            ? "Add notification"
            : "Edit notification"
          : "Notifications"
      }
      description={`${source.action.label} · ${taskNames.join(", ") || source.stage.name}`}
      onClose={() => {
        if (!mutation.isPending) onClose();
      }}
      footer={
        !editing ? (
          <div className="flex justify-end gap-2">
            <GeneralButton
              onClick={onClose}
              disabled={mutation.isPending}
              variant="outline"
            >
              Close
            </GeneralButton>
            {canEdit ? (
              <GeneralButton
                form={formId}
                type="submit"
                disabled={mutation.isPending || !form.formState.isDirty}
              >
                {mutation.isPending ? "Saving…" : "Save notifications"}
              </GeneralButton>
            ) : null}
          </div>
        ) : undefined
      }
    >
      {editing ? (
        <WorkflowActionNotificationForm
          key={editing === "new" ? "new" : editing.id}
          editor={source.editor}
          stage={source.stage}
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
      ) : (
        <FormProvider {...form}>
          <form id={formId} onSubmit={save} className="space-y-4">
            <WorkflowActionNotificationsList
              editor={source.editor}
              stage={source.stage}
              notifications={notifications}
              canEdit={editable}
              onAdd={() => setEditing("new")}
              onEdit={setEditing}
              onDelete={(id) =>
                change(notifications.filter((row) => row.id !== id))
              }
            />
            {mutation.error ? (
              <p role="alert" className="text-sm text-red-700">
                {mutation.error.message}
              </p>
            ) : null}
          </form>
        </FormProvider>
      )}
    </RightDrawer>
  );
}
