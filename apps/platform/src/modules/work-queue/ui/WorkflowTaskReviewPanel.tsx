"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import { GeneralButton, GeneralButtonLink } from "@/components/ui/button";
import { AuthoritativeEligibilityTask } from "@/modules/eligibility/ui/screening/AuthoritativeEligibilityTask";
import { DynamicFormTask } from "@/modules/forms/ui/renderer/DynamicFormTask";
import type { TaskDetail } from "@/modules/work-queue/TaskTypes";
import { useCompleteWorkflowTask } from "@/modules/work-queue/WorkQueueHooks";
import {
  ChecklistTaskForm,
  type ReviewDraftState,
} from "@/modules/work-queue/ui/ChecklistTaskForm";
import { WorkflowTaskDecisionActions } from "@/modules/work-queue/ui/WorkflowTaskDecisionActions";
import { WorkflowTaskPreviewSection } from "@/modules/workflows/ui/definitions/WorkflowTaskPreviewSections";
import {
  WorkflowTaskReviewLayout,
  WorkflowTaskReviewSummary,
} from "@/modules/workflows/ui/WorkflowTaskReviewLayout";

export function WorkflowTaskReviewPanel({ task }: { task: TaskDetail }) {
  const router = useRouter();
  const completion = useCompleteWorkflowTask(task.taskInstanceId);
  const completeFormRef = useRef<(() => void) | null>(null);
  const registerFormCompletion = useCallback((complete: (() => void) | null) => {
    completeFormRef.current = complete;
  }, []);
  const [reviewState, setReviewState] = useState<ReviewDraftState>({
    pending: false,
    ready: (!task.hasChecklist || task.checklistCompleted)
      && (!task.commentFields.length || task.commentCompleted)
      && (!task.documentRequirements.length || task.documentsCompleted)
      && (!task.scoring?.criteria.length || task.scoringCompleted),
  });
  const [formState, setFormState] = useState({ pending: false, ready: false });
  const onReviewStateChange = useCallback((next: ReviewDraftState) => {
    setReviewState((current) => current.pending === next.pending
      && current.ready === next.ready ? current : next);
  }, []);
  const onFormStateChange = useCallback((next: { pending: boolean; ready: boolean }) => {
    setFormState((current) => current.pending === next.pending
      && current.ready === next.ready ? current : next);
  }, []);

  const hasReviewFields = task.hasChecklist
    || task.commentFields.length > 0
    || task.documentRequirements.length > 0
    || Boolean(task.scoring?.criteria.length);
  const hasTaskWork = Boolean(task.formVersionId) || hasReviewFields;
  const separateEligibilitySection = task.canEvaluateEligibility
    && !task.formVersionId;
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
    Boolean(task.formVersionId) && task.formCompleted,
    task.hasChecklist && task.checklistCompleted,
    task.documentRequirements.length > 0 && task.documentsCompleted,
    Boolean(task.scoring?.criteria.length) && task.scoringCompleted,
    task.commentFields.length > 0 && task.commentCompleted,
  ].filter(Boolean).length;
  const reviewReady = !hasReviewFields || reviewState.ready;
  const eligibilityReady = !task.canEvaluateEligibility
    || Boolean(task.eligibilityEvaluation);
  const formReady = !task.formVersionId || task.formCompleted
    || (!task.canEvaluateEligibility && formState.ready);
  const formSubmitNeeded = Boolean(
    task.formVersionId && !task.formCompleted && !task.canEvaluateEligibility,
  );
  const canComplete = task.taskStatus !== "COMPLETED"
    && reviewReady
    && eligibilityReady
    && formReady
    && !reviewState.pending
    && !formState.pending
    && !completion.isPending;
  const canDecide =
    eligibilityReady
    && (!task.formVersionId || task.canEvaluateEligibility || task.formCompleted)
    && (!task.hasChecklist || task.checklistCompleted)
    && (!task.documentRequirements.length || task.documentsCompleted)
    && (!task.scoring?.criteria.length || task.scoringCompleted)
    && (!task.commentFields.length || task.commentCompleted);

  const actionTask = formState.pending || reviewState.pending
    ? {
        ...task,
        actions: task.actions.map((action) => ({
          ...action,
          available: false,
          unavailableReason: "Wait for the current task changes to save.",
        })),
      }
    : task;

  function completeTask() {
    completion.mutate({
      expectedRowVersion: task.rowVersion,
      items: task.resultItems,
      comments: task.resultComments,
      documents: task.resultDocuments,
      scores: task.resultScores,
    }, {
      onSuccess: (result) => {
        if (result.taskStatus === "COMPLETED") {
          toast.success("Task completed.");
          router.push("/admin/work-queue");
        } else {
          toast.info("Task work saved. Complete the remaining requirements.");
        }
      },
    });
  }

  const actions = (
    <div className="space-y-4">
      {canDecide ? <WorkflowTaskDecisionActions task={actionTask} /> : null}
      {completion.isError ? (
        <p className="text-sm text-red-700" role="alert">
          {completion.error.message}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <GeneralButtonLink variant="outline" href="/admin/work-queue">
          Back to queue
        </GeneralButtonLink>
        {!task.actions.length ? (
          <GeneralButton
            disabled={!canComplete}
            onClick={formSubmitNeeded
              ? () => completeFormRef.current?.()
              : completeTask}
            type="button"
          >
            {completion.isPending ? "Completing…" : task.taskStatus === "COMPLETED"
              ? "Completed" : "Complete Task"}
          </GeneralButton>
        ) : null}
      </div>
    </div>
  );

  return (
    <WorkflowTaskReviewLayout
      actions={actions}
      sectionCount={sectionCount}
      stageName={task.stageName}
      summary={
        <WorkflowTaskReviewSummary
          completedCount={completedCount}
          message={sectionCount
            ? `${completedCount} of ${sectionCount} sections complete`
            : "No configured sections"}
          status={task.taskStatus === "COMPLETED" ? "Completed" : "In progress"}
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
          formContent={task.formVersionId ? (
            <DynamicFormTask
              eligibilityEvaluation={task.eligibilityEvaluation}
              eligibilityTask={task.canEvaluateEligibility}
              hasTaskActions={task.actions.length > 0}
              onCompleteTaskForm={registerFormCompletion}
              onStateChange={onFormStateChange}
              taskId={task.taskInstanceId}
            />
          ) : undefined}
          onStateChange={onReviewStateChange}
          task={task}
        />
      ) : null}
    </WorkflowTaskReviewLayout>
  );
}
