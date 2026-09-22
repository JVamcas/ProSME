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
import { validateTaskConfiguration, validateTaskResult } from "@/modules/workflows/WorkflowTaskRegistry";
import { executeSequentialTransitionInTransaction } from "@/modules/workflows/application/runtime/ServerSequentialTransitionService";
import { getWorkflowActionAvailability } from "@/modules/workflows/application/runtime/ServerWorkflowActionAvailabilityService";
import type {
  ChecklistConfigurationItem,
  ChecklistResultItem,
  CompleteChecklistTaskInput,
} from "./TaskTypes";

function parseChecklistConfiguration(config: unknown) {
  const parsed = validateTaskConfiguration("CHECKLIST", config);
  if (!parsed.success) {
    throw new ResourceConflictError(
      "This task has an invalid published checklist configuration.",
    );
  }
  return (parsed.data as { items: ChecklistConfigurationItem[] }).items;
}

function parseChecklistResult(result: unknown) {
  if (result === null) return [];
  const parsed = validateTaskResult("CHECKLIST", result);
  return parsed.success
    ? (parsed.data as { items: ChecklistResultItem[] }).items
    : [];
}

function parseEligibilityResult(result: unknown) {
  if (result === null) return null;
  const parsed = validateTaskResult("AUTOMATED_RULE_CHECK", result);
  return parsed.success ? parsed.data : null;
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
  if (task.taskType !== "CHECKLIST") {
    return {
      ...view,
      actions,
      checklistItems: [],
      dueAt: task.dueAt ? new Date(task.dueAt).toISOString() : null,
      eligibilityEvaluation: task.taskType === "AUTOMATED_RULE_CHECK"
        ? parseEligibilityResult(result)
        : null,
      resultItems: [],
    };
  }
  return {
    ...view,
    actions,
    checklistItems: parseChecklistConfiguration(config),
    dueAt: task.dueAt ? new Date(task.dueAt).toISOString() : null,
    eligibilityEvaluation: null,
    resultItems: parseChecklistResult(result),
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
  if (task.taskType !== "CHECKLIST") {
    throw new ResourceConflictError("This task is not a checklist task.");
  }
  const configured = parseChecklistConfiguration(task.config);
  validateChecklistItems(configured, input.items);
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
