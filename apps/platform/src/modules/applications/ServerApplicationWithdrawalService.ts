import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  IdempotencyConflictError,
  RequestValidationError,
  ResourceConflictError,
  ResourceNotFoundError,
} from "@/lib/resource-errors";
import type { ApplicationWithdrawalInput } from "./api/ApplicationWithdrawalSchemas";
import { withdrawOwnedApplication } from "./infrastructure/ApplicationWithdrawalRepository";
import {
  applyApplicationWithdrawalInTransaction,
  type WithdrawalApplicationState,
} from "./infrastructure/ApplicationWithdrawalStateRepository";
import type { SubmissionTransaction } from "./infrastructure/ApplicationSubmissionRepository";

export async function withdrawApplication(
  user: AuthenticatedUser | null,
  applicationId: string,
  input: ApplicationWithdrawalInput,
  idempotencyKey: string | null,
  correlationId: string,
) {
  const actor = requirePermission(
    user,
    permissionCodes.fundingApplicationOwnWithdraw,
  );
  const key = idempotencyKey?.trim();
  if (!key || key.length > 200) {
    throw new RequestValidationError("A valid Idempotency-Key header is required.");
  }
  const outcome = await withdrawOwnedApplication({
    actorId: actor.id,
    applicationId,
    comment: input.comment,
    correlationId,
    idempotencyKey: key,
    reasonCode: input.reasonCode,
  });
  if (outcome.kind === "withdrawn") return outcome.result;
  if (outcome.kind === "not_found") {
    throw new ResourceNotFoundError("application");
  }
  if (outcome.kind === "idempotency_conflict") {
    throw new IdempotencyConflictError(
      "That idempotency key was already used for a different withdrawal.",
    );
  }
  throw new ResourceConflictError(
    "Withdrawal is not available in the current processing state.",
  );
}

export function withdrawFromWorkflowAction(
  transaction: SubmissionTransaction,
  input: {
    actorId: string;
    application: WithdrawalApplicationState;
    correlationId: string;
    reasonCode?: string;
    stageId: string;
    workflowId: string;
    withdrawnAt: Date;
  },
) {
  return applyApplicationWithdrawalInTransaction(transaction, input);
}
