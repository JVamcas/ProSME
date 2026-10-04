"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import { AuthoritativeEligibilityTask } from "@/modules/eligibility/ui/screening/AuthoritativeEligibilityTask";
import { DynamicFormTask } from "@/modules/forms/ui/renderer/DynamicFormTask";
import type { TaskDetail } from "@/modules/work-queue/TaskTypes";
import { useCompleteWorkflowTask } from "@/modules/work-queue/ui/useWorkQueue";
import {
  ChecklistTaskForm,
  type ReviewDraftState,
} from "@/modules/work-queue/ui/ChecklistTaskForm";
import { WorkflowTaskDecisionActions } from "@/modules/workflows/ui/tasks/WorkflowTaskDecisionActions";
import { WorkflowTaskPreviewSection } from "@/modules/workflows/ui/definitions/WorkflowTaskPreviewSections";
import {
  WorkflowTaskReviewLayout,
  WorkflowTaskReviewSummary,
} from "@/modules/workflows/ui/WorkflowTaskReviewLayout";
import { workflowTaskReviewReadiness } from "./WorkflowTaskReviewReadiness";

export function WorkflowTaskReviewPanel({ task }: { task: TaskDetail }) {
  const router = useRouter();
  const completion = useCompleteWorkflowTask(task.taskInstanceId);
  const [eligibilityActionContainer, setEligibilityActionContainer] =
    useState<HTMLDivElement | null>(null);
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
    (next: { pending: boolean; ready: boolean }) => {
      setFormState((current) =>
        current.pending === next.pending && current.ready === next.ready
          ? current
          : next,
      );
    },
    [],
  );

  const {
    actionTask,
    canComplete,
    completedCount,
    eligibilityReady,
    formIsLastSection,
    formSectionComplete,
    formSubmitNeeded,
    hasTaskWork,
    sectionCount,
    separateEligibilitySection,
    showActionsInFinalStep,
    submitsFormWithTaskAction,
    taskProgressStatus,
  } = workflowTaskReviewReadiness(
    task,
    reviewState,
    formState,
    completion.isPending,
  );
  const [isFinalReviewStep, setFinalReviewStep] = useState(
    sectionCount - Number(separateEligibilitySection) <= 1,
  );
  const [isFinalFormStep, setFinalFormStep] = useState(!task.formVersionId);
  const showDecisionActions =
    (!showActionsInFinalStep || isFinalReviewStep) &&
    (!formIsLastSection || isFinalFormStep);

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
      {task.actions.length ||
      task.taskType === "CONTRIBUTING" ||
      (task.canEvaluateEligibility && task.formVersionId) ? (
        <WorkflowTaskDecisionActions
          showDecisionActions={showDecisionActions}
          eligibilityActionRef={
            task.canEvaluateEligibility && task.formVersionId
              ? setEligibilityActionContainer
              : undefined
          }
          additionalItems={
            task.taskType === "CONTRIBUTING" && showDecisionActions
              ? [
                  {
                    id: "complete-task",
                    label: completion.isPending
                      ? "Completing…"
                      : "Complete Task",
                    disabled: !canComplete,
                    description: !eligibilityReady
                      ? "Run the eligibility ruleset before completing this task."
                      : !canComplete
                        ? "Complete the required task work and wait for changes to save."
                        : undefined,
                    onAction: formSubmitNeeded
                      ? () => void completeFormRef.current?.()
                      : completeTask,
                  },
                ]
              : []
          }
          beforeAction={
            submitsFormWithTaskAction
              ? async () => {
                  const completeForm = completeFormRef.current;
                  if (!completeForm) {
                    throw new Error("The task form is not ready to submit.");
                  }
                  await completeForm();
                }
              : undefined
          }
          task={actionTask}
        />
      ) : null}
    </div>
  );

  return (
    <WorkflowTaskReviewLayout
      actions={taskActions}
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
          onFinalStepChange={setFinalReviewStep}
          formContent={
            task.formVersionId ? (
              <DynamicFormTask
                eligibilityActionContainer={eligibilityActionContainer}
                eligibilityEvaluation={task.eligibilityEvaluation}
                eligibilityTask={task.canEvaluateEligibility}
                onCompleteTaskForm={registerFormCompletion}
                onFinalStepChange={setFinalFormStep}
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
