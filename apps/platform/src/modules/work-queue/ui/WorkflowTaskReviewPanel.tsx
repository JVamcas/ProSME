"use client";

import { useState } from "react";

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
  const [eligibilityPending, setEligibilityPending] = useState(false);
  const hasReviewFields = task.hasChecklist || task.commentFields.length > 0;
  const separateEligibilitySection = task.canEvaluateEligibility
    && !task.formVersionId;
  const sectionCount = [
    separateEligibilitySection,
    Boolean(task.formVersionId),
    task.hasChecklist,
    task.commentFields.length > 0,
  ].filter(Boolean).length;
  const completedCount = [
    separateEligibilitySection && Boolean(task.eligibilityEvaluation),
    Boolean(task.formVersionId) && task.formCompleted,
    task.hasChecklist && task.checklistCompleted,
    task.commentFields.length > 0 && task.commentCompleted,
  ].filter(Boolean).length;
  const canDecide =
    (!task.formVersionId || task.canEvaluateEligibility || task.formCompleted)
    && (!task.hasChecklist || task.checklistCompleted)
    && (!task.commentFields.length || task.commentCompleted);

  const actionTask = eligibilityPending
    ? {
        ...task,
        actions: task.actions.map((action) => ({
          ...action,
          available: false,
          unavailableReason: "Run eligibility using the current answers first.",
        })),
      }
    : task;
  return (
    <WorkflowTaskReviewLayout
      actions={canDecide ? <WorkflowTaskDecisionActions task={actionTask} /> : null}
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
      {task.formVersionId ? (
        <WorkflowTaskPreviewSection
          defaultOpen
          status={task.formCompleted ? "Completed" : "Required"}
          title={task.formName ?? "Form"}
        >
          <DynamicFormTask
            eligibilityEvaluation={task.eligibilityEvaluation}
            eligibilityTask={task.canEvaluateEligibility}
            onPendingChange={task.canEvaluateEligibility
              ? setEligibilityPending
              : undefined}
            taskId={task.taskInstanceId}
          />
        </WorkflowTaskPreviewSection>
      ) : null}
      {hasReviewFields ? <ChecklistTaskForm task={task} /> : null}
    </WorkflowTaskReviewLayout>
  );
}
