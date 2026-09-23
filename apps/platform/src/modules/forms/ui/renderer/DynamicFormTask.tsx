"use client";

import { PortalErrorState } from "@/components/layout/PortalErrorState";
import { PortalLoadingState } from "@/components/layout/PortalLoadingState";
import { GeneralButton } from "@/components/ui/button";
import { useTaskForm } from "@/modules/forms/FormHooks";
import type { TaskFormData } from "@/modules/forms/FormTypes";
import type { WorkflowTaskAction } from "@/modules/work-queue/TaskTypes";
import { WorkflowTaskActions } from "@/modules/work-queue/ui/WorkflowTaskActions";
import { useState } from "react";
import { useDynamicFormController } from "./DynamicFormController";
import { FormRenderer } from "./FormRenderer";

function FormActions({
  completePending,
  onSave,
  readOnly,
  savePending,
}: {
  completePending: boolean;
  onSave: () => void;
  readOnly: boolean;
  savePending: boolean;
}) {
  if (readOnly) return null;
  const disabled = savePending || completePending;
  return (
    <div className="flex justify-end gap-3">
      <GeneralButton disabled={disabled} onClick={onSave} type="button">
        {savePending ? "Saving…" : "Save draft"}
      </GeneralButton>
    </div>
  );
}

function FormErrors({
  completeError,
  saveError,
}: {
  completeError?: Error | null;
  saveError?: Error | null;
}) {
  const message = saveError?.message ?? completeError?.message;
  if (!message) return null;
  return (
    <p className="text-sm text-red-700" role="alert">
      {message}
    </p>
  );
}

function DraftPersistenceStatus({
  hasUnsavedChanges,
  isSaving,
}: {
  hasUnsavedChanges: boolean;
  isSaving: boolean;
}) {
  const message = isSaving
    ? "Saving draft…"
    : hasUnsavedChanges
      ? "Unsaved changes"
      : "Draft saved";
  return (
    <p aria-live="polite" className="text-sm text-brand-navy/65">
      {message}
    </p>
  );
}

function LoadedDynamicFormTask({
  actions,
  data,
  taskId,
}: {
  actions: WorkflowTaskAction[];
  data: TaskFormData;
  taskId: string;
}) {
  const controller = useDynamicFormController(taskId, data);
  const [selectedActionKey, setSelectedActionKey] = useState<string | null>(
    null,
  );
  const readOnly = data.response?.status === "COMPLETED";
  return (
    <FormRenderer
      definition={data.schema}
      formData={controller.values}
      onChange={controller.setValues}
      onSubmit={(values) => {
        if (selectedActionKey) {
          controller.completeFormValues(values, selectedActionKey);
        } else if (!actions.length) {
          controller.completeFormValues(values, null);
        }
      }}
      readOnly={readOnly}
      runtimeContext={data.context}
    >
      <div className="mt-5 space-y-3">
        {!readOnly ? (
          <DraftPersistenceStatus
            hasUnsavedChanges={controller.hasUnsavedChanges}
            isSaving={controller.save.isPending}
          />
        ) : null}
        <FormErrors
          completeError={controller.complete.error}
          saveError={controller.save.error}
        />
        <FormActions
          completePending={controller.complete.isPending}
          onSave={controller.saveDraftValues}
          readOnly={readOnly}
          savePending={controller.save.isPending}
        />
        {actions.length ? (
          <WorkflowTaskActions
            actions={actions}
            disabled={
              readOnly
              || controller.complete.isPending
              || controller.save.isPending
            }
            onSelect={setSelectedActionKey}
          />
        ) : !readOnly ? (
          <div className="flex justify-end">
            <GeneralButton
              disabled={
                controller.complete.isPending || controller.save.isPending
              }
              type="submit"
            >
              {controller.complete.isPending
                ? "Completing…"
                : data.schema.submitLabel}
            </GeneralButton>
          </div>
        ) : null}
      </div>
    </FormRenderer>
  );
}

export function DynamicFormTask({
  actions,
  taskId,
}: {
  actions: WorkflowTaskAction[];
  taskId: string;
}) {
  const query = useTaskForm(taskId);
  if (query.isPending) {
    return (
      <PortalLoadingState
        description="Preparing the published form for this task."
        title="Loading form"
      />
    );
  }
  if (query.isError || !query.data) {
    return (
      <PortalErrorState
        description={query.error?.message ?? "Form unavailable."}
        onAction={() => void query.refetch()}
        title="Form could not be loaded"
      />
    );
  }
  return (
    <LoadedDynamicFormTask
      actions={actions}
      data={query.data}
      taskId={taskId}
    />
  );
}
