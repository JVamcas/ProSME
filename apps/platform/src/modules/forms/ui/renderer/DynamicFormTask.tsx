"use client";

import { PortalErrorState } from "@/components/layout/PortalErrorState";
import { PortalLoadingState } from "@/components/layout/PortalLoadingState";
import { GeneralButton } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useTaskForm } from "@/modules/forms/FormHooks";
import type { TaskFormData } from "@/modules/forms/FormTypes";
import { useDynamicFormController } from "./DynamicFormController";
import { FormRenderer } from "./FormRenderer";

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
  hasSavedDraft,
  hasUnsavedChanges,
  isSaving,
  saveError,
}: {
  hasSavedDraft: boolean;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  saveError: Error | null;
}) {
  const message = saveError
    ? "Save failed — retry available"
    : isSaving
      ? "Saving draft…"
      : hasUnsavedChanges
        ? "Autosave pending"
        : hasSavedDraft
          ? "Draft saved"
          : "No changes yet";

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
  const readOnly = data.response?.status === "COMPLETED";
  return (
    <>
      <FormRenderer
        definition={data.schema}
        formData={controller.values}
        onChange={controller.setValues}
        onSubmit={(values) => controller.completeFormValues(values, null)}
        readOnly={readOnly}
        runtimeContext={data.context}
      >
        <div className="mt-6 space-y-4 border-t border-brand-navy/10 pt-5">
          <FormErrors
            completeError={controller.complete.error}
            saveError={controller.save.error}
          />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {!readOnly ? (
              <DraftPersistenceStatus
                hasSavedDraft={Boolean(data.response)}
                hasUnsavedChanges={controller.hasUnsavedChanges}
                isSaving={controller.save.isPending}
                saveError={controller.save.error}
              />
            ) : null}
            {!readOnly ? (
              <div className="flex flex-wrap items-center gap-3 sm:ml-auto">
                {controller.save.error ? (
                  <GeneralButton
                    disabled={controller.save.isPending || controller.complete.isPending}
                    onClick={controller.saveDraftValues}
                    type="button"
                    variant="outline"
                  >
                    Retry save
                  </GeneralButton>
                ) : null}
                <GeneralButton
                  disabled={controller.complete.isPending || controller.save.isPending}
                  type="submit"
                >
                  {controller.complete.isPending
                    ? "Completing…"
                    : data.schema.submitLabel}
                </GeneralButton>
              </div>
            ) : null}
          </div>
        </div>
      </FormRenderer>
      <ConfirmationDialog
        confirmText="Leave page"
        isOpen={Boolean(controller.pendingNavigationHref)}
        message="Your latest form changes have not finished saving. Leave this page?"
        onCancel={controller.cancelNavigation}
        onConfirm={controller.confirmNavigation}
        title="Leave with unsaved changes?"
      />
    </>
  );
}

export function DynamicFormTask({
  taskId,
}: {
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
      data={query.data}
      taskId={taskId}
    />
  );
}
