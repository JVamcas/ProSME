import "server-only";

import {
  requireAuthenticatedUser,
  requirePermission,
} from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  readChecklistTaskCompletion,
  writeChecklistTaskCompletion,
} from "@/modules/workflows/infrastructure/WorkflowTaskActionRepository";
import { readWorkflowTask } from "@/modules/workflows/infrastructure/WorkflowTaskRepository";
import {
  IdempotencyConflictError,
  RequestValidationError,
  ResourceConflictError,
  ResourceNotFoundError,
} from "@/lib/resource-errors";
import {
  commentResultSchema,
  taskCommentFields,
  taskRunsAuthoritativeEligibility,
  validateChecklistResult,
  validateEligibilityResult,
} from "@/modules/workflows/WorkflowTaskRegistry";
import { executeSequentialTransitionInTransaction } from "@/modules/workflows/application/runtime/ServerSequentialTransitionService";
import { getWorkflowActionAvailability } from "@/modules/workflows/application/runtime/ServerWorkflowActionAvailabilityService";
import type {
  ChecklistConfigurationItem,
  ChecklistResultItem,
  CompleteChecklistTaskInput,
} from "./TaskTypes";

function parseChecklistResult(result: unknown) {
  if (result === null) return [];
  const parsed = validateChecklistResult(result);
  return parsed.success
    ? (parsed.data as { items: ChecklistResultItem[] }).items
    : [];
}

function parseEligibilityResult(result: unknown) {
  if (result === null) return null;
  const parsed = validateEligibilityResult(result);
  return parsed.success ? parsed.data : null;
}

function validateCommentItems(
  configured: ReturnType<typeof taskCommentFields>,
  submitted: NonNullable<CompleteChecklistTaskInput["comments"]>,
) {
  const expected = new Set(configured.map((field) => field.key));
  const received = new Set(submitted.map((item) => item.key));
  if (received.size !== submitted.length || received.size !== expected.size
    || submitted.some((item) => !expected.has(item.key))) {
    throw new RequestValidationError(
      "Submit one answer for every configured comment or recommendation field.",
    );
  }
  const answers = new Map(submitted.map((item) => [item.key, item.value.trim()]));
  if (configured.some((field) => field.mandatory && !answers.get(field.key))) {
    throw new RequestValidationError("Complete all required comments and recommendations.");
  }
}

function validateChecklistItems(
  configured: ChecklistConfigurationItem[],
  submitted: ChecklistResultItem[],
) {
  const expected = new Set(configured.map((item) => item.code));
  const received = new Set(submitted.map((item) => item.code));
  if (received.size !== submitted.length || received.size !== expected.size) {
    throw new RequestValidationError(
      "Submit one decision for every configured checklist item.",
    );
  }
  if (submitted.some((item) => !expected.has(item.code))) {
    throw new RequestValidationError(
      "The checklist contains an item that is not in this workflow version.",
    );
  }
  const decisions = new Map(submitted.map((item) => [item.code, item]));
  const incomplete = configured.some(
    (item) => item.required && !decisions.get(item.code)?.accepted,
  );
  if (incomplete) {
    throw new RequestValidationError(
      "All required pre-screening items must be confirmed before completion.",
    );
  }
}

export async function getWorkflowTask(
  user: AuthenticatedUser | null,
  taskId: string,
) {
  const actor = requireAuthenticatedUser(user);
  const task = await readWorkflowTask(actor.id, taskId);
  if (!task) throw new ResourceNotFoundError("workflow task");
  const { config, permissions, result, ...view } = task;
  requirePermission(actor, permissions.view);
  const actions = await getWorkflowActionAvailability(actor, {
    sourceStageInstanceId: task.stageInstanceId,
    taskId: task.taskInstanceId,
    workflowInstanceId: task.workflowInstanceId,
  });
  const hasChecklist = task.checklistItems.length > 0;
  const commentFields = taskCommentFields(config);
  const parsedComments = commentResultSchema.safeParse(result);
  const resultComments = parsedComments.success ? parsedComments.data.comments : [];
  const canEvaluateEligibility = taskRunsAuthoritativeEligibility(config);
  return {
    ...view,
    actions,
    canEvaluateEligibility,
    checklistCompleted: hasChecklist && parseChecklistResult(result).length > 0,
    checklistItems: task.checklistItems,
    commentFields,
    commentCompleted: commentFields.length > 0
      && resultComments.length === commentFields.length,
    resultComments,
    dueAt: task.dueAt ? new Date(task.dueAt).toISOString() : null,
    eligibilityEvaluation: canEvaluateEligibility
      ? parseEligibilityResult(result)
      : null,
    hasChecklist,
    formCompleted: task.formCompleted,
    resultItems: hasChecklist ? parseChecklistResult(result) : [],
  };
}

export async function completeChecklistTask(
  user: AuthenticatedUser | null,
  taskId: string,
  input: CompleteChecklistTaskInput,
  command: { correlationId: string; idempotencyKey: string },
) {
  const actor = requireAuthenticatedUser(user);
  const writeInput = {
    ...command,
    ...input,
    actionKey: input.actionKey ?? null,
    actorId: actor.id,
    taskId,
  };
  const task = await readWorkflowTask(actor.id, taskId);
  if (!task) throw new ResourceNotFoundError("workflow task");
  requirePermission(
    actor,
    input.actionKey ? task.permissions.decide : task.permissions.edit,
  );
  const replay = await readChecklistTaskCompletion(writeInput);
  if (replay?.kind === "completed") return replay.result;
  if (replay?.kind === "idempotency_conflict") {
    throw new IdempotencyConflictError(
      "That idempotency key was already used with different task data.",
    );
  }
  const commentFields = taskCommentFields(task.config);
  if (!task.checklistItems.length && !commentFields.length) {
    throw new ResourceConflictError("This task has no review fields.");
  }
  validateChecklistItems(task.checklistItems, input.items);
  validateCommentItems(commentFields, input.comments ?? []);
  const outcome = await writeChecklistTaskCompletion(
    writeInput,
    executeSequentialTransitionInTransaction,
  );
  if (outcome.kind === "idempotency_conflict") {
    throw new IdempotencyConflictError(
      "That idempotency key was already used for another task completion.",
    );
  }
  if (outcome.kind === "not_found") {
    throw new ResourceConflictError(
      "This task changed or is no longer assigned to you. Refresh it.",
    );
  }
  if (outcome.kind === "conflict") {
    throw new ResourceConflictError(
      "The checklist cannot be completed in its current workflow configuration.",
    );
  }
  return outcome.result;
}
