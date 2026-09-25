"use client";

import { AuthoritativeEligibilityTask } from "@/modules/eligibility/ui/screening/AuthoritativeEligibilityTask";
import { DynamicFormTask } from "@/modules/forms/ui/renderer/DynamicFormTask";
import type { TaskDetail } from "@/modules/work-queue/TaskTypes";
import { ChecklistTaskForm } from "@/modules/work-queue/ui/ChecklistTaskForm";
import { WorkflowTaskDecisionActions } from "@/modules/work-queue/ui/WorkflowTaskDecisionActions";
import { WorkflowTaskPreviewSection } from "@/modules/workflows/ui/definitions/WorkflowTaskPreviewSections";
import {
  WorkflowTaskReviewLayout,
  WorkflowTaskReviewSummary,
} from "@/modules/workflows/ui/WorkflowTaskReviewLayout";

export function WorkflowTaskReviewPanel({ task }: { task: TaskDetail }) {
  const hasReviewFields = task.hasChecklist || task.commentFields.length > 0;
  const sectionCount = [
    task.canEvaluateEligibility,
    Boolean(task.formVersionId),
    task.hasChecklist,
    task.commentFields.length > 0,
  ].filter(Boolean).length;
  const completedCount = [
    task.canEvaluateEligibility && Boolean(task.eligibilityEvaluation),
    Boolean(task.formVersionId) && task.formCompleted,
    task.hasChecklist && task.checklistCompleted,
    task.commentFields.length > 0 && task.commentCompleted,
  ].filter(Boolean).length;
  const canDecide =
    (!task.canEvaluateEligibility || Boolean(task.eligibilityEvaluation))
    && (!task.formVersionId || task.formCompleted)
    && (!task.hasChecklist || task.checklistCompleted)
    && (!task.commentFields.length || task.commentCompleted);

  return (
    <WorkflowTaskReviewLayout
      actions={canDecide ? <WorkflowTaskDecisionActions task={task} /> : null}
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
      {task.canEvaluateEligibility ? (
        <WorkflowTaskPreviewSection
          defaultOpen
          status={task.eligibilityEvaluation ? "Evaluated" : "Pending"}
          title="Eligibility"
        >
          <AuthoritativeEligibilityTask task={task} />
        </WorkflowTaskPreviewSection>
      ) : null}
      {task.formVersionId ? (
        <WorkflowTaskPreviewSection
          defaultOpen
          status={task.formCompleted ? "Completed" : "Required"}
          title="Form"
        >
          <DynamicFormTask taskId={task.taskInstanceId} />
        </WorkflowTaskPreviewSection>
      ) : null}
      {hasReviewFields ? <ChecklistTaskForm task={task} /> : null}
    </WorkflowTaskReviewLayout>
  );
}
