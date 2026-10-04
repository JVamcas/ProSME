"use client";

import { AuthoritativeEligibilityResult } from "@/modules/eligibility/ui/screening/AuthoritativeEligibilityResult";
import { DynamicFormTask } from "@/modules/forms/ui/renderer/DynamicFormTask";
import { WorkflowTaskHoldStatus } from "@/modules/workflows/ui/tasks/WorkflowTaskHoldStatus";
import type { TaskDetail } from "../TaskTypes";
import { ChecklistTaskForm } from "./ChecklistTaskForm";

const ignoreReviewState = () => undefined;

export function ReadOnlyTaskReview({ task }: { task: TaskDetail }) {
  const assignee = task.assignedUserName ?? task.assignedRoleName ?? "Unassigned";
  return (
    <div className="space-y-5">
      <p className="rounded-xl bg-brand-cream p-4 text-sm text-brand-navy/75">
        Read-only · Assigned to {assignee}. You can inspect this task’s saved work.
      </p>
      {task.holds?.length ? <WorkflowTaskHoldStatus holds={task.holds} /> : null}
      {task.eligibilityEvaluation ? (
        <AuthoritativeEligibilityResult evaluation={task.eligibilityEvaluation} />
      ) : null}
      <ChecklistTaskForm
        formContent={task.formVersionId ? (
          <DynamicFormTask readOnly taskId={task.taskInstanceId} />
        ) : undefined}
        formSectionComplete={task.formCompleted}
        onStateChange={ignoreReviewState}
        readOnly
        task={task}
      />
    </div>
  );
}
