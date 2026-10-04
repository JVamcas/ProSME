import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import { can, requireAnyPermission, requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from "@/lib/resource-errors";
import { getPublishedSystemFormRuntimeVersion } from "@/modules/forms/application/ServerSystemFormService";
import {
  changeTaskCoi,
  readTaskCoiGate,
} from "../../infrastructure/WorkflowCoiRepository";
import { readWorkflowTaskAccess } from "../../infrastructure/WorkflowTaskAccessRepository";
import { WorkflowTaskUnavailableError } from "./ServerWorkflowTaskReadService";
import { readPendingWorkflowCoiReview } from "../../infrastructure/WorkflowCoiReviewRepository";
import { replaceWorkflowReviewer } from "../../infrastructure/WorkflowReviewerReplacementRepository";

export async function getWorkflowTaskCoi(
  user: AuthenticatedUser | null,
  taskId: string,
) {
  const actor = requireAnyPermission(user, [
    permissionCodes.workflowTaskAssignedRead,
    permissionCodes.workflowTaskAllRead,
  ]);
  const gate = can(actor, permissionCodes.workflowTaskAssignedRead)
    ? await readTaskCoiGate(actor.id, taskId)
    : null;
  if (!gate) {
    if (!can(actor, permissionCodes.workflowTaskAllRead)) {
      throw new WorkflowTaskUnavailableError();
    }
    const task = await readWorkflowTaskAccess(actor.id, taskId);
    if (!task) throw new WorkflowTaskUnavailableError();
    return {
      form: null,
      taskId: task.taskId,
      taskName: task.taskName,
      taskStatus: task.taskStatus,
      rowVersion: task.rowVersion,
      gated: false,
      state: "NOT_APPLICABLE",
      cleared: false,
      readOnly: true,
    };
  }
  if (gate.gated && !gate.coiFormVersionId) {
    throw new ResourceConflictError(
      "The workflow has no bound Conflict of Interest form version.",
    );
  }
  const form = gate.coiFormVersionId
    ? await getPublishedSystemFormRuntimeVersion(gate.coiFormVersionId)
    : null;
  return {
    form,
    taskId: gate.taskId,
    taskName: gate.taskName,
    taskStatus: gate.status,
    rowVersion: gate.rowVersion,
    gated: gate.gated,
    state: gate.state,
    cleared:
      !gate.gated ||
      ["CLEARED_NO_CONFLICT", "CLEARED_AFTER_REVIEW"].includes(gate.state),
  };
}

export async function declareWorkflowTaskCoi(
  user: AuthenticatedUser | null,
  input: {
    taskId: string;
    expectedRowVersion: number;
    decision: "NO_CONFLICT" | "DISCLOSE";
    disclosureText?: string;
  },
) {
  const actor = requirePermission(
    user,
    permissionCodes.workflowTaskAssignedProcess,
  );
  if (input.decision === "DISCLOSE" && !input.disclosureText?.trim()) {
    throw new ResourceConflictError("A disclosure is required.");
  }
  const result = await changeTaskCoi({
    ...input,
    actorId: actor.id,
    independentReview: false,
  });
  if (!result)
    throw new ResourceConflictError("The COI state or task changed.");
  return result;
}

export async function reviewWorkflowTaskCoi(
  user: AuthenticatedUser | null,
  input: {
    taskId: string;
    expectedRowVersion: number;
    decision: "CLEAR" | "RECUSE" | "REVOKE";
    reason: string;
    replacementUserId?: string;
    correlationId: string;
    idempotencyKey: string;
  },
) {
  const actor = requirePermission(user, permissionCodes.workflowCoiAllReview);
  if (input.decision === "RECUSE") {
    if (!input.replacementUserId) {
      throw new ResourceConflictError("An eligible replacement is required.");
    }
    const result = await replaceWorkflowReviewer({
      actorId: actor.id,
      coiDecision: "RECUSE",
      correlationId: input.correlationId,
      expectedRowVersion: input.expectedRowVersion,
      idempotencyKey: input.idempotencyKey,
      reason: input.reason,
      replacementUserId: input.replacementUserId,
      taskId: input.taskId,
    });
    if (!result)
      throw new ResourceConflictError(
        "The disclosure, task or replacement eligibility changed.",
      );
    return { state: "RECUSED" as const, replacementTaskId: result.taskId };
  }
  const result = await changeTaskCoi({
    actorId: actor.id,
    taskId: input.taskId,
    expectedRowVersion: input.expectedRowVersion,
    decision: input.decision,
    reason: input.reason,
    independentReview: true,
  });
  if (!result)
    throw new ResourceConflictError("The COI state or task changed.");
  return result;
}

export async function getPendingWorkflowTaskCoiDisclosure(
  user: AuthenticatedUser | null,
  taskId: string,
) {
  const actor = requirePermission(user, permissionCodes.workflowCoiAllReview);
  const disclosure = await readPendingWorkflowCoiReview(actor.id, taskId);
  if (!disclosure) throw new ResourceNotFoundError("pending COI disclosure");
  return disclosure;
}
