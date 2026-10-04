"use client";

import { useRouter } from "next/navigation";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { activeFormDefinition } from "@/modules/forms/engine/FormVisibility";
import { validateFormValues } from "@/modules/forms/FormValidation";
import { toast } from "sonner";
import { useEligibilityTerminationConfirmation } from "@/modules/eligibility/ui/screening/useEligibilityTerminationConfirmation";
import type { AuthoritativeEligibilityTaskResult } from "@/modules/work-queue/TaskTypes";
import { AuthoritativeEligibilityResult } from "@/modules/eligibility/ui/screening/AuthoritativeEligibilityResult";

import { PortalErrorState } from "@/shared/ui/portal/PortalErrorState";
import { PortalLoadingState } from "@/shared/ui/portal/PortalLoadingState";
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
  draftIsValid,
  hasSavedDraft,
  hasUnsavedChanges,
  isSaving,
  saveError,
}: {
  draftIsValid: boolean;
  hasSavedDraft: boolean;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  saveError: Error | null;
}) {
  const message = !draftIsValid
    ? "Correct invalid fields to save"
    : saveError
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
  eligibilityEvaluation,
  eligibilityTask = false,
  eligibilityActionContainer,
  onCompleteTaskForm,
  onPendingChange,
  onStateChange,
  onFinalStepChange,
}: {
  data: TaskFormData;
  taskId: string;
  eligibilityEvaluation?: AuthoritativeEligibilityTaskResult | null;
  eligibilityTask?: boolean;
  eligibilityActionContainer?: HTMLElement | null;
  onCompleteTaskForm?: (complete: (() => Promise<void>) | null) => void;
  onPendingChange?: (pending: boolean) => void;
  onStateChange?: (state: { pending: boolean; ready: boolean }) => void;
  onFinalStepChange?: (final: boolean) => void;
}) {
  const evaluation = useEligibilityTerminationConfirmation(taskId);
  const completionRef = useRef<() => Promise<void>>(async () => undefined);
  const controller = useDynamicFormController(
    taskId,
    data,
    eligibilityTask && evaluation.isPending,
  );
  const pending =
    controller.hasUnsavedChanges ||
    controller.save.isPending ||
    controller.complete.isPending ||
    evaluation.isPending;
  useEffect(() => {
    completionRef.current = async () => {
      await controller.finalizeFormValues(controller.values);
    };
  });
  const ready = validateFormValues(
    activeFormDefinition(data.schema, controller.values).fields,
    controller.values,
    true,
  );
  useEffect(() => {
    onPendingChange?.(pending);
    onStateChange?.({
      pending,
      ready,
    });
  }, [onPendingChange, onStateChange, pending, ready]);
  useEffect(() => {
    onCompleteTaskForm?.(() => completionRef.current());
    return () => onCompleteTaskForm?.(null);
  }, [onCompleteTaskForm]);
  const router = useRouter();

  async function runEligibility() {
    const revision = controller.currentRevision();
    try {
      const result = await evaluation.mutateAsync({
        expectedResponseRowVersion: data.response?.rowVersion,
        expectedRowVersion: data.taskRowVersion,
        values: controller.values,
      });
      if (!result) return;
      controller.markSaved(revision);
      toast.success(
        result.terminalStatus
          ? "Application terminated after a hard eligibility failure."
          : "Eligibility evaluation completed.",
      );
      if (result.terminalStatus) {
        router.push("/admin/work-queue");
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Eligibility evaluation failed.",
      );
    }
  }
  const readOnly = data.response?.status === "COMPLETED";
  const eligibilityAction = eligibilityTask ? (
    <GeneralButton
      disabled={
        !ready ||
        controller.save.isPending ||
        controller.complete.isPending ||
        evaluation.isPending
      }
      onClick={() => void runEligibility()}
      type="button"
    >
      {evaluation.isPending
        ? "Running eligibility…"
        : eligibilityEvaluation
          ? "Re-run eligibility ruleset"
          : "Run eligibility ruleset"}
    </GeneralButton>
  ) : null;

  return (
    <>
      {evaluation.confirmationDialog}
      <FormRenderer
        definition={data.schema}
        onFinalStepChange={onFinalStepChange}
        formData={controller.values}
        onChange={controller.setValues}
        onSubmit={() => undefined}
        readOnly={readOnly}
        runtimeContext={data.context}
      >
        <div className="mt-6 space-y-4 border-t border-brand-navy/10 pt-5">
          <FormErrors
            completeError={evaluation.error ?? controller.complete.error}
            saveError={controller.save.error}
          />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {!readOnly ? (
              <DraftPersistenceStatus
                draftIsValid={controller.draftIsValid}
                hasSavedDraft={Boolean(data.response)}
                hasUnsavedChanges={controller.hasUnsavedChanges}
                isSaving={controller.save.isPending}
                saveError={controller.save.error}
              />
            ) : null}
            {!readOnly || eligibilityTask ? (
              <div className="flex flex-wrap items-center gap-3 sm:ml-auto">
                {!readOnly && controller.save.error ? (
                  <GeneralButton
                    disabled={
                      controller.save.isPending || controller.complete.isPending
                    }
                    onClick={controller.saveDraftValues}
                    type="button"
                    variant="outline"
                  >
                    Retry save
                  </GeneralButton>
                ) : null}
                {eligibilityActionContainer === undefined
                  ? eligibilityAction
                  : null}
              </div>
            ) : null}
          </div>
        </div>
      </FormRenderer>
      {eligibilityActionContainer
        ? createPortal(eligibilityAction, eligibilityActionContainer)
        : null}
      {eligibilityTask && eligibilityEvaluation ? (
        <div className="mt-5">
          <AuthoritativeEligibilityResult evaluation={eligibilityEvaluation} />
        </div>
      ) : null}
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
  eligibilityEvaluation,
  eligibilityTask = false,
  eligibilityActionContainer,
  onCompleteTaskForm,
  onPendingChange,
  onStateChange,
  onFinalStepChange,
}: {
  taskId: string;
  eligibilityEvaluation?: AuthoritativeEligibilityTaskResult | null;
  eligibilityTask?: boolean;
  eligibilityActionContainer?: HTMLElement | null;
  onCompleteTaskForm?: (complete: (() => Promise<void>) | null) => void;
  onPendingChange?: (pending: boolean) => void;
  onStateChange?: (state: { pending: boolean; ready: boolean }) => void;
  onFinalStepChange?: (final: boolean) => void;
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
      eligibilityEvaluation={eligibilityEvaluation}
      eligibilityTask={eligibilityTask}
      eligibilityActionContainer={eligibilityActionContainer}
      onCompleteTaskForm={onCompleteTaskForm}
      onPendingChange={onPendingChange}
      onStateChange={onStateChange}
      onFinalStepChange={onFinalStepChange}
    />
  );
}
