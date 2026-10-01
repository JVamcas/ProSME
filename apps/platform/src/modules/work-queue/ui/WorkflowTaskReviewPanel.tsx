"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import { GeneralButton } from "@/components/ui/button";
import { AuthoritativeEligibilityTask } from "@/modules/eligibility/ui/screening/AuthoritativeEligibilityTask";
import { DynamicFormTask } from "@/modules/forms/ui/renderer/DynamicFormTask";
import type { TaskDetail } from "@/modules/work-queue/TaskTypes";
import { useCompleteWorkflowTask } from "@/modules/work-queue/WorkQueueHooks";
import {
  ChecklistTaskForm,
  type ReviewDraftState,
} from "@/modules/work-queue/ui/ChecklistTaskForm";
import { WorkflowTaskDecisionActions } from "@/modules/workflows/ui/tasks/WorkflowTaskDecisionActions";
import { isWorkflowStageDecisionAction } from "@/modules/workflows/domain/actions/WorkflowActionDefinition";
import { WorkflowTaskPreviewSection } from "@/modules/workflows/ui/definitions/WorkflowTaskPreviewSections";
import {
  WorkflowTaskReviewLayout,
  WorkflowTaskReviewSummary,
} from "@/modules/workflows/ui/WorkflowTaskReviewLayout";
import { formSectionCountsAsComplete } from "./WorkflowTaskProgress";

export function WorkflowTaskReviewPanel({ task }: { task: TaskDetail }) {
  const router = useRouter();
  const completion = useCompleteWorkflowTask(task.taskInstanceId);
  const completeFormRef = useRef<(() => Promise<void>) | null>(null);
  const registerFormCompletion = useCallback(
    (complete: (() => Promise<void>) | null) => {
      completeFormRef.current = complete;
    },
    [],
  );
  const [reviewState, setReviewState] = useState<ReviewDraftState>({
    pending: false,
    ready:
      (!task.hasChecklist || task.checklistCompleted) &&
      (!task.commentFields.length || task.commentCompleted) &&
      (!task.documentRequirements.length || task.documentsCompleted) &&
      (!task.scoring?.criteria.length || task.scoringCompleted),
  });
  const [formState, setFormState] = useState<{
    pending: boolean;
    ready: boolean;
  }>({ pending: false, ready: false });
  const onReviewStateChange = useCallback((next: ReviewDraftState) => {
    setReviewState((current) =>
      current.pending === next.pending && current.ready === next.ready
        ? current
        : next,
    );
  }, []);
  const onFormStateChange = useCallback(
    (next: {
      pending: boolean;
      ready: boolean;
    }) => {
      setFormState((current) =>
        current.pending === next.pending &&
          current.ready === next.ready
          ? current
          : next,
      );
    },
    [],
  );

  const hasReviewFields =
    task.hasChecklist ||
    task.commentFields.length > 0 ||
    task.documentRequirements.length > 0 ||
    Boolean(task.scoring?.criteria.length);
  const hasTaskWork = Boolean(task.formVersionId) || hasReviewFields;
  const showActionsInFinalStep =
    task.displayMode === "STEP_PROGRESS" && hasTaskWork;
  const separateEligibilitySection =
    task.canEvaluateEligibility && !task.formVersionId;
  const submitsFormWithTaskAction = Boolean(
    task.formVersionId &&
      !task.formCompleted &&
      task.taskType === "STAGE_DECISION",
  );
  const formSectionComplete = formSectionCountsAsComplete({
    formCompleted: task.formCompleted,
    pending: formState.pending,
    ready: formState.ready,
    taskActionSubmission: submitsFormWithTaskAction,
  });
  const sectionCount = [
    separateEligibilitySection,
    Boolean(task.formVersionId),
    task.hasChecklist,
    task.documentRequirements.length > 0,
    Boolean(task.scoring?.criteria.length),
    task.commentFields.length > 0,
  ].filter(Boolean).length;
  const completedCount = [
    separateEligibilitySection && Boolean(task.eligibilityEvaluation),
    Boolean(task.formVersionId) && formSectionComplete,
    task.hasChecklist && task.checklistCompleted,
    task.documentRequirements.length > 0 && task.documentsCompleted,
    Boolean(task.scoring?.criteria.length) && task.scoringCompleted,
    task.commentFields.length > 0 && task.commentCompleted,
  ].filter(Boolean).length;
  const reviewReady = !hasReviewFields || reviewState.ready;
  const eligibilityReady =
    !task.canEvaluateEligibility || Boolean(task.eligibilityEvaluation);
  const formReady =
    !task.formVersionId ||
    task.formCompleted ||
    (!task.canEvaluateEligibility && formState.ready);
  const formSubmitNeeded = Boolean(
    task.formVersionId && !task.formCompleted && !task.canEvaluateEligibility,
  );
  const canComplete =
    task.taskStatus !== "COMPLETED" &&
    reviewReady &&
    eligibilityReady &&
    formReady &&
    !reviewState.pending &&
    !formState.pending &&
    !completion.isPending;
  const canDecide =
    eligibilityReady &&
    (!task.formVersionId ||
      task.canEvaluateEligibility ||
      task.formCompleted ||
      (submitsFormWithTaskAction && formState.ready && !formState.pending)) &&
    (!task.hasChecklist || task.checklistCompleted) &&
    (!task.documentRequirements.length || task.documentsCompleted) &&
    (!task.scoring?.criteria.length || task.scoringCompleted) &&
    (!task.commentFields.length || task.commentCompleted);

  const changesPending = formState.pending || reviewState.pending;
  const taskProgressStatus = task.taskStatus === "COMPLETED"
    ? "Completed"
    : task.taskType === "STAGE_DECISION" && canDecide
      ? "Ready for decision"
      : task.taskStatus === "PENDING"
        ? "Pending"
        : "In progress";
  const actionTask = {
    ...task,
    actions: task.actions.map((action) => {
      if (
        !changesPending &&
        (canDecide || !isWorkflowStageDecisionAction(action.actionType))
      ) {
        return action;
      }
      return {
        ...action,
        available: false,
        unavailableReason: changesPending
          ? "Wait for the current task changes to save."
          : "Complete the required task work before making the stage decision.",
      };
    }),
  };

  function completeTask() {
    completion.mutate(
      {
        expectedRowVersion: task.rowVersion,
        items: task.resultItems,
        comments: task.resultComments,
        documents: task.resultDocuments,
        scores: task.resultScores,
      },
      {
        onSuccess: (result) => {
          if (result.taskStatus === "COMPLETED") {
            toast.success("Task completed.");
            router.push("/admin/work-queue");
          } else {
            toast.info("Task work saved. Complete the remaining requirements.");
          }
        },
        onError: (error) => toast.error(error.message),
      },
    );
  }

  const taskActions = (
    <div className="space-y-4">
      {task.actions.length ? (
        <WorkflowTaskDecisionActions
          beforeAction={submitsFormWithTaskAction
            ? async () => {
                const completeForm = completeFormRef.current;
                if (!completeForm) {
                  throw new Error("The task form is not ready to submit.");
                }
                await completeForm();
              }
            : undefined}
          task={actionTask}
        />
      ) : null}
      {task.taskType === "CONTRIBUTING" ? (
        <div className="flex justify-end">
          <GeneralButton
            disabled={!canComplete}
            onClick={
              formSubmitNeeded
                ? () => completeFormRef.current?.()
                : completeTask
            }
            type="button"
          >
            {completion.isPending
              ? "Completing…"
              : task.taskStatus === "COMPLETED"
                ? "Completed"
                : "Complete Task"}
          </GeneralButton>
        </div>
      ) : null}
    </div>
  );

  return (
    <WorkflowTaskReviewLayout
      actions={showActionsInFinalStep ? <></> : taskActions}
      sectionCount={sectionCount}
      stageName={task.stageName}
      summary={
        <WorkflowTaskReviewSummary
          completedCount={completedCount}
          message={
            sectionCount
              ? `${completedCount} of ${sectionCount} sections complete`
              : "No configured sections"
          }
          status={taskProgressStatus}
          totalCount={sectionCount}
        />
      }
    >
      {separateEligibilitySection ? (
        <WorkflowTaskPreviewSection
          defaultOpen
          status={task.eligibilityEvaluation ? "Evaluated" : "Pending"}
          title="Eligibility"
        >
          <AuthoritativeEligibilityTask task={task} />
        </WorkflowTaskPreviewSection>
      ) : null}
      {hasTaskWork ? (
        <ChecklistTaskForm
          finalActions={showActionsInFinalStep ? taskActions : undefined}
          formContent={
            task.formVersionId ? (
              <DynamicFormTask
                eligibilityEvaluation={task.eligibilityEvaluation}
                eligibilityTask={task.canEvaluateEligibility}
                onCompleteTaskForm={registerFormCompletion}
                onStateChange={onFormStateChange}
                taskId={task.taskInstanceId}
              />
            ) : undefined
          }
          formSectionComplete={formSectionComplete}
          onStateChange={onReviewStateChange}
          task={task}
        />
      ) : null}
    </WorkflowTaskReviewLayout>
  );
}
