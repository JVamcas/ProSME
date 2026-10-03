import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from "@/lib/resource-errors";
import type { WorkflowEscalationCancellationInput } from "../../domain/runtime/WorkflowEscalationCancellation";
import {
  hasCommittedEscalationWork,
  lockEscalationCancellationContext,
  persistEscalationCancellation,
  withEscalationCancellationTransaction,
} from "../../infrastructure/WorkflowEscalationCancellationRepository";

export async function cancelWorkflowEscalation(
  user: AuthenticatedUser | null,
  input: WorkflowEscalationCancellationInput & {
    taskId: string;
    correlationId: string;
  },
) {
  const actor = requirePermission(
    user,
    permissionCodes.workflowEscalationOwnCancel,
  );
  return withEscalationCancellationTransaction(async (transaction) => {
    const context = await lockEscalationCancellationContext(
      transaction,
      input.taskId,
      input.escalationId,
    );
    if (
      !context ||
      context.sourceAssignedUserId !== actor.id ||
      context.escalatedBy !== actor.id ||
      context.trigger !== "MANUAL"
    ) {
      throw new ResourceNotFoundError("own workflow escalation");
    }
    if (
      context.escalationStatus !== "ACTIVE" ||
      !["PENDING", "IN_PROGRESS"].includes(context.taskStatus) ||
      context.workflowStatus !== "ACTIVE" ||
      !["ACTIVE", "BLOCKED"].includes(context.stageStatus)
    ) {
      throw new ResourceConflictError(
        "This escalation can no longer be cancelled because it was resolved or the task was committed.",
      );
    }
    if (context.rowVersion !== input.expectedRowVersion) {
      throw new ResourceConflictError(
        "This task changed. Refresh your queue and try again.",
      );
    }
    if (
      await hasCommittedEscalationWork(
        transaction,
        input.taskId,
        input.escalationId,
      )
    ) {
      throw new ResourceConflictError(
        "The new assignee has committed their review. This escalation can no longer be cancelled.",
      );
    }
    return persistEscalationCancellation(transaction, context, {
      actorId: actor.id,
      correlationId: input.correlationId,
      taskId: input.taskId,
    });
  });
}
