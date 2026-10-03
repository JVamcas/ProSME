import type { TaskDetail } from "../TaskTypes";
import type { ReviewDraftState } from "./ChecklistTaskForm";
import { isWorkflowStageDecisionAction } from "@/modules/workflows/domain/actions/WorkflowActionDefinition";
import { formSectionCountsAsComplete } from "./WorkflowTaskProgress";

export function workflowTaskReviewReadiness(
  task: TaskDetail,
  reviewState: ReviewDraftState,
  formState: { pending: boolean; ready: boolean },
  completing: boolean,
) {
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
    !completing;
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
  const taskProgressStatus =
    task.taskStatus === "COMPLETED"
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

  return {
    actionTask,
    canComplete,
    completedCount,
    eligibilityReady,
    formSectionComplete,
    formSubmitNeeded,
    hasTaskWork,
    sectionCount,
    separateEligibilitySection,
    showActionsInFinalStep,
    submitsFormWithTaskAction,
    taskProgressStatus,
    formIsLastSection: Boolean(task.formVersionId) && !hasReviewFields,
  };
}
