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
  const formSubmitNeeded = Boolean(
    task.formVersionId && !task.formCompleted && !task.canEvaluateEligibility,
  );
  const formSectionComplete = formSectionCountsAsComplete({
    formCompleted: task.formCompleted,
    pending: formState.pending,
    ready: formState.ready,
    taskActionSubmission: submitsFormWithTaskAction || formSubmitNeeded,
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
  const canComplete =
    task.taskStatus !== "COMPLETED" &&
    !task.hasOpenRfi &&
    task.processingStatus !== "ON_HOLD" &&
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
  const decisionActions = actionTask.actions.filter((action) =>
    isWorkflowStageDecisionAction(action.actionType),
  );
  const decisionAvailable = decisionActions.some((action) => action.available);
  let taskBlockedReason: string | null = null;
  let taskProgressStatus =
    task.taskStatus === "PENDING" ? "Pending" : "In progress";
  if (task.taskStatus === "COMPLETED") {
    taskProgressStatus = "Completed";
  } else if (task.processingStatus === "ON_HOLD") {
    taskProgressStatus = "On hold";
    taskBlockedReason =
      "Resume the applicable holds before continuing this task.";
  } else if (task.hasOpenRfi) {
    taskProgressStatus = "Awaiting information";
    taskBlockedReason =
      task.taskType === "STAGE_DECISION" && task.prerequisitesComplete
        ? "Review threshold met — awaiting closure of the open information request."
        : "Close the open information request before completing this task.";
  } else if (task.taskType === "STAGE_DECISION") {
    taskProgressStatus = decisionAvailable
      ? "Ready for decision"
      : "Decision blocked";
    taskBlockedReason = decisionAvailable
      ? null
      : (decisionActions.find((action) => action.unavailableReason)
          ?.unavailableReason ?? "No stage decision is currently available.");
  }

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
    taskBlockedReason,
    formIsLastSection: Boolean(task.formVersionId) && !hasReviewFields,
  };
}
