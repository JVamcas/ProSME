import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import { releaseSelfAssignedTask } from "@/modules/workflows/infrastructure/WorkflowSelfAssignmentReleaseRepository";
import { readSelfAssignmentPool } from "@/modules/workflows/infrastructure/WorkflowSelfAssignmentPoolRepository";
import {
  readWorkQueue,
  writeTaskClaim,
} from "@/modules/workflows/infrastructure/WorkQueueRepository";
import {
  IdempotencyConflictError,
  ResourceConflictError,
} from "@/lib/resource-errors";
import {
  decodeWorkQueueCursor,
  encodeWorkQueueCursor,
} from "./WorkQueueCursor";
import type { WorkQueueListInput, WorkQueuePage } from "./WorkQueueTypes";

export async function getWorkQueue(
  user: AuthenticatedUser | null,
  input: WorkQueueListInput,
): Promise<WorkQueuePage> {
  const actor = requirePermission(user, permissionCodes.workflowTaskPoolRead);
  const projection = await readWorkQueue(
    actor.id,
    input,
    input.after ? decodeWorkQueueCursor(input.after) : undefined,
  );
  const hasNextPage = projection.items.length > input.limit;
  const items = projection.items.slice(0, input.limit);
  return {
    items,
    nextCursor: hasNextPage
      ? encodeWorkQueueCursor(items.at(-1)!)
      : null,
    total: projection.total,
  };
}

export async function claimTask(
  user: AuthenticatedUser | null,
  input: {
    correlationId: string;
    expectedRowVersion: number;
    idempotencyKey: string;
    taskId: string;
  },
) {
  const actor = requirePermission(user, permissionCodes.workflowTaskClaim);
  const outcome = await writeTaskClaim({ ...input, actorId: actor.id });
  if (outcome.kind === "idempotency_conflict") {
    throw new IdempotencyConflictError(
      "That idempotency key was already used for another task claim.",
    );
  }
  if (outcome.kind === "conflict") {
    throw new ResourceConflictError(
      "This task is no longer available to claim. Refresh the work queue.",
    );
  }
  return outcome.result;
}

export async function getSelfAssignmentPool(
  user: AuthenticatedUser | null,
  input: { after?: string; limit: number; search?: string },
) {
  const actor = requirePermission(user, permissionCodes.workflowTaskPoolRead);
  const projection = await readSelfAssignmentPool(
    actor.id,
    input,
    input.after ? decodeWorkQueueCursor(input.after) : undefined,
  );
  const hasNextPage = projection.items.length > input.limit;
  const items = projection.items.slice(0, input.limit);
  return {
    items,
    nextCursor: hasNextPage
      ? encodeWorkQueueCursor(items.at(-1)!)
      : null,
    total: projection.total,
  };
}

export async function releaseTask(
  user: AuthenticatedUser | null,
  input: {
    correlationId: string;
    expectedRowVersion: number;
    idempotencyKey: string;
    taskId: string;
  },
) {
  const actor = requirePermission(user, permissionCodes.workflowTaskClaim);
  const outcome = await releaseSelfAssignedTask({ ...input, actorId: actor.id });
  if (outcome.kind === "idempotency_conflict") {
    throw new IdempotencyConflictError(
      "That idempotency key was already used for another command.",
    );
  }
  if (outcome.kind === "conflict") {
    throw new ResourceConflictError(
      "This assignment cannot be released under its configured rules.",
    );
  }
  return outcome.result;
}
