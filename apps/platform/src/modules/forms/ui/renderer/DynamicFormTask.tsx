"use client";

import { GeneralButton } from "@/components/ui/button";
import { useTaskForm } from "@/modules/forms/FormHooks";
import type { TaskFormData } from "@/modules/forms/FormTypes";
import { useDynamicFormController } from "./DynamicFormController";
import { FormRenderer } from "./FormRenderer";

function FormActions({
  completePending,
  onSave,
  readOnly,
  savePending,
  submitLabel,
}: {
  completePending: boolean;
  onSave: () => void;
  readOnly: boolean;
  savePending: boolean;
  submitLabel: string;
}) {
  if (readOnly) return null;
  const disabled = savePending || completePending;
  return (
    <div className="flex justify-end gap-3">
      <GeneralButton disabled={disabled} onClick={onSave} type="button">
        {savePending ? "Saving…" : "Save draft"}
      </GeneralButton>
      <GeneralButton disabled={disabled} type="submit">
        {completePending ? "Submitting…" : submitLabel}
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
  data,
  taskId,
}: {
  data: TaskFormData;
  taskId: string;
}) {
  const controller = useDynamicFormController(taskId, data);
  const readOnly = data.submission?.status === "COMPLETED";
  return (
    <FormRenderer
      definition={data.schema}
      formData={controller.values}
      onChange={controller.setValues}
      onSubmit={controller.completeFormValues}
      readOnly={readOnly}
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
          submitLabel={data.schema.submitLabel}
        />
      </div>
    </FormRenderer>
  );
}

export function DynamicFormTask({ taskId }: { taskId: string }) {
  const query = useTaskForm(taskId);
  if (query.isPending) return <p>Loading form…</p>;
  if (query.isError || !query.data) {
    return (
      <p className="text-sm text-red-700" role="alert">
        {query.error?.message ?? "Form unavailable."}
      </p>
    );
  }
  return <LoadedDynamicFormTask data={query.data} taskId={taskId} />;
}
