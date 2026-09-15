import "server-only";

import { capabilities } from "@/auth/authorization/capabilities";
import { requireCapability } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  readChecklistTaskCompletion,
  writeChecklistTaskCompletion,
} from "@/db/repositories/WorkflowTaskActionRepository";
import { readWorkflowTask } from "@/db/repositories/WorkflowTaskRepository";
import {
  IdempotencyConflictError,
  RequestValidationError,
  ResourceConflictError,
  ResourceNotFoundError,
} from "@/lib/resource-errors";
import { validateTaskConfiguration, validateTaskResult } from "@/modules/workflows/WorkflowTaskRegistry";
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
  const actor = requireCapability(user, capabilities.workflowTaskRead);
  const task = await readWorkflowTask(actor.id, taskId);
  if (!task) throw new ResourceNotFoundError("workflow task");
  const { config, result, ...view } = task;
  if (task.taskType !== "CHECKLIST") {
    return {
      ...view,
      checklistItems: [],
      dueAt: task.dueAt ? new Date(task.dueAt).toISOString() : null,
      resultItems: [],
    };
  }
  return {
    ...view,
    checklistItems: parseChecklistConfiguration(config),
    dueAt: task.dueAt ? new Date(task.dueAt).toISOString() : null,
    resultItems: parseChecklistResult(result),
  };
}

export async function completeChecklistTask(
  user: AuthenticatedUser | null,
  taskId: string,
  input: CompleteChecklistTaskInput,
  command: { correlationId: string; idempotencyKey: string },
) {
  const actor = requireCapability(user, capabilities.workflowTaskComplete);
  requireCapability(user, capabilities.applicationScreen);
  const writeInput = {
    ...command,
    ...input,
    actorId: actor.id,
    taskId,
  };
  const replay = await readChecklistTaskCompletion(writeInput);
  if (replay?.kind === "completed") return replay.result;
  if (replay?.kind === "idempotency_conflict") {
    throw new IdempotencyConflictError(
      "That idempotency key was already used with different task data.",
    );
  }
  const task = await readWorkflowTask(actor.id, taskId);
  if (!task) throw new ResourceNotFoundError("workflow task");
  if (task.taskType !== "CHECKLIST") {
    throw new ResourceConflictError("This task is not a checklist task.");
  }
  const configured = parseChecklistConfiguration(task.config);
  validateChecklistItems(configured, input.items);
  const outcome = await writeChecklistTaskCompletion(writeInput);
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
      "The workflow cannot advance because its completion transition is missing.",
    );
  }
  return outcome.result;
}
