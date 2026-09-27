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
import { writeTaskReviewDraft } from "@/modules/workflows/infrastructure/WorkflowTaskReviewRepository";
import {
  IdempotencyConflictError,
  RequestValidationError,
  ResourceConflictError,
  ResourceNotFoundError,
} from "@/lib/resource-errors";
import {
  commentResultSchema,
  documentResultSchema,
  scoreResultSchema,
  taskCommentFields,
  taskDisplayMode,
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
  DocumentRequirementItem,
  DocumentResultItem,
  SaveTaskReviewDraftInput,
  ScoreResultItem,
  ScoringConfiguration,
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

function parseDocumentResult(result: unknown): DocumentResultItem[] {
  const parsed = documentResultSchema.safeParse(result);
  return parsed.success ? parsed.data.documents : [];
}

function parseScoreResult(result: unknown): ScoreResultItem[] {
  const parsed = scoreResultSchema.safeParse(result);
  return parsed.success ? parsed.data.scores : [];
}

function validateCommentItems(
  configured: ReturnType<typeof taskCommentFields>,
  submitted: NonNullable<CompleteChecklistTaskInput["comments"]>,
  requireMandatory = true,
) {
  const expected = new Set(configured.map((field) => field.key));
  const received = new Set(submitted.map((item) => item.key));
  if (
    received.size !== submitted.length ||
    received.size !== expected.size ||
    submitted.some((item) => !expected.has(item.key))
  ) {
    throw new RequestValidationError(
      "Submit one answer for every configured comment or recommendation field.",
    );
  }
  const answers = new Map(
    submitted.map((item) => [item.key, item.value.trim()]),
  );
  if (
    requireMandatory &&
    configured.some((field) => field.mandatory && !answers.get(field.key))
  ) {
    throw new RequestValidationError(
      "Complete all required comments and recommendations.",
    );
  }
}

function validateChecklistItems(
  configured: ChecklistConfigurationItem[],
  submitted: ChecklistResultItem[],
  requireAcceptance = true,
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
  if (requireAcceptance && incomplete) {
    throw new RequestValidationError(
      "All required pre-screening items must be confirmed before completion.",
    );
  }
}

function validateDocumentItems(
  configured: DocumentRequirementItem[],
  submitted: DocumentResultItem[],
  requireMandatory = true,
) {
  const expected = new Set(configured.map((item) => item.stableKey));
  const received = new Set(submitted.map((item) => item.category));
  if (
    received.size !== submitted.length ||
    received.size !== expected.size ||
    submitted.some((item) => !expected.has(item.category))
  ) {
    throw new RequestValidationError(
      "Submit one verification for every configured document requirement.",
    );
  }
  if (
    requireMandatory &&
    configured.some((item) => item.mandatory && !item.document)
  ) {
    throw new RequestValidationError("Upload every required document.");
  }
}

function validateScoreItems(
  configured: ScoringConfiguration | null,
  submitted: ScoreResultItem[],
  requireComplete = true,
) {
  const criteria = configured?.criteria ?? [];
  const expected = new Set(criteria.map((item) => item.stableKey));
  const received = new Set(submitted.map((item) => item.criterion));
  if (
    received.size !== submitted.length ||
    received.size !== expected.size ||
    submitted.some((item) => !expected.has(item.criterion))
  ) {
    throw new RequestValidationError(
      "Submit one score for every configured scoring criterion.",
    );
  }
  const invalid = criteria.some((criterion) => {
    const answer = submitted.find(
      (item) => item.criterion === criterion.stableKey,
    );
    if (!answer || answer.score === null) return requireComplete;
    return (
      answer.score < criterion.scaleMinimum ||
      answer.score > criterion.scaleMaximum ||
      (requireComplete && criterion.mandatoryComment && !answer.comment?.trim())
    );
  });
  if (invalid) {
    throw new RequestValidationError(
      "Complete every score within its configured range and add required comments.",
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
  const resultComments = parsedComments.success
    ? parsedComments.data.comments
    : [];
  const resultDocuments = parseDocumentResult(result);
  const resultScores = parseScoreResult(result);
  const canEvaluateEligibility = taskRunsAuthoritativeEligibility(config);
  return {
    ...view,
    actions,
    canEvaluateEligibility,
    checklistCompleted:
      hasChecklist &&
      task.checklistItems.every((item) => {
        const answer = parseChecklistResult(result).find(
          (entry) => entry.code === item.code,
        );
        return Boolean(answer && (!item.required || answer.accepted));
      }),
    checklistItems: task.checklistItems,
    commentFields,
    displayMode: taskDisplayMode(config),
    commentCompleted:
      commentFields.length > 0 &&
      commentFields.every((field) => {
        const answer = resultComments.find((item) => item.key === field.key);
        return Boolean(answer && (!field.mandatory || answer.value.trim()));
      }),
    resultComments,
    dueAt: task.dueAt ? new Date(task.dueAt).toISOString() : null,
    documentsCompleted:
      task.documentRequirements.length > 0 &&
      task.documentRequirements.every(
        (requirement) =>
          !requirement.mandatory || Boolean(requirement.document),
      ),
    eligibilityEvaluation: canEvaluateEligibility
      ? parseEligibilityResult(result)
      : null,
    hasChecklist,
    formCompleted: task.formCompleted,
    resultItems: hasChecklist ? parseChecklistResult(result) : [],
    resultDocuments,
    resultScores,
    scoringCompleted:
      Boolean(task.scoring?.criteria.length) &&
      task.scoring!.criteria.every((criterion) => {
        const answer = resultScores.find(
          (item) => item.criterion === criterion.stableKey,
        );
        return Boolean(
          answer &&
          answer.score !== null &&
          answer.score >= criterion.scaleMinimum &&
          answer.score <= criterion.scaleMaximum &&
          (!criterion.mandatoryComment || answer.comment?.trim()),
        );
      }),
  };
}

export async function saveTaskReviewDraft(
  user: AuthenticatedUser | null,
  taskId: string,
  input: SaveTaskReviewDraftInput,
  correlationId: string,
) {
  const actor = requireAuthenticatedUser(user);
  const task = await readWorkflowTask(actor.id, taskId);
  if (!task) throw new ResourceNotFoundError("workflow task");
  requirePermission(actor, task.permissions.edit);
  const commentFields = taskCommentFields(task.config);
  validateChecklistItems(task.checklistItems, input.items, false);
  validateCommentItems(commentFields, input.comments ?? [], false);
  validateDocumentItems(
    task.documentRequirements,
    input.documents ?? [],
    false,
  );
  validateScoreItems(task.scoring, input.scores ?? [], false);
  const saved = await writeTaskReviewDraft({
    ...input,
    actorId: actor.id,
    correlationId,
    taskId,
  });
  if (!saved) {
    throw new ResourceConflictError(
      "The task changed or is no longer assigned to you.",
    );
  }
  return { saved: true };
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
  if (
    !input.actionKey &&
    task.taskType === "STAGE_DECISION" &&
    !task.formVersionId
  ) {
    throw new RequestValidationError(
      "A stage-decision task must be completed through a decision action.",
    );
  }
  const replay = await readChecklistTaskCompletion(writeInput);
  if (replay?.kind === "completed") return replay.result;
  if (replay?.kind === "idempotency_conflict") {
    throw new IdempotencyConflictError(
      "That idempotency key was already used with different task data.",
    );
  }
  const commentFields = taskCommentFields(task.config);
  validateChecklistItems(task.checklistItems, input.items);
  validateCommentItems(commentFields, input.comments ?? []);
  validateDocumentItems(task.documentRequirements, input.documents ?? []);
  validateScoreItems(task.scoring, input.scores ?? []);
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
