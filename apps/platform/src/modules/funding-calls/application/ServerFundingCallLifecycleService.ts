import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  IdempotencyConflictError,
  ResourceConflictError,
  ResourceNotFoundError,
} from "@/lib/resource-errors";
import type { FundingCallLifecycleCommandInput } from "../api/FundingCallSchemas";
import type { FundingCallView } from "../api/FundingCallTransport";
import {
  FundingCallTransitionDeniedError,
  resolveFundingCallTransition,
} from "../domain/FundingCallLifecycle";
import {
  listPublishedFundingCallsDueToClose,
  listScheduledFundingCallsDueToOpen,
  readFundingCallLifecycleReplay,
  transitionFundingCall,
} from "../infrastructure/FundingCallLifecycleRepository";
import { readFundingCallById } from "../infrastructure/FundingCallRepository";
import { toFundingCallView } from "./FundingCallViewMapper";

const commandPermissions = {
  ARCHIVE: permissionCodes.fundingCallArchive,
  RESUME: permissionCodes.fundingCallResume,
  SUSPEND: permissionCodes.fundingCallSuspend,
  WITHDRAW: permissionCodes.fundingCallWithdraw,
  WITHDRAW_FOR_AMENDMENT: permissionCodes.fundingCallWithdrawForAmendmentAll,
} as const;

export async function changeFundingCallLifecycleStatus(
  user: AuthenticatedUser | null,
  fundingCallId: string,
  input: FundingCallLifecycleCommandInput,
  idempotencyKey: string,
  correlationId: string,
): Promise<FundingCallView> {
  const actor = requirePermission(user, commandPermissions[input.command]);
  const replay = await readFundingCallLifecycleReplay(
    fundingCallId,
    idempotencyKey,
    input.command,
  );
  if (replay) return toFundingCallView(replay);
  const call = await readFundingCallById(fundingCallId);
  if (!call) throw new ResourceNotFoundError("funding call");
  if (call.rowVersion !== input.expectedRowVersion) {
    throw new ResourceConflictError(
      "The funding call changed. Refresh it before continuing.",
    );
  }
  const now = new Date();
  try {
    resolveFundingCallTransition(call, input.command, now);
  } catch (error) {
    if (error instanceof FundingCallTransitionDeniedError) {
      throw new ResourceConflictError(error.message);
    }
    throw error;
  }
  const result = await transitionFundingCall({
    actorId: actor.id,
    command: input.command,
    correlationId,
    expectedRowVersion: input.expectedRowVersion,
    fundingCallId,
    idempotencyKey,
    now,
    reason: input.reason,
  });
  if (result.kind === "idempotency_conflict") {
    throw new IdempotencyConflictError(
      "The idempotency key was already used for another command.",
    );
  }
  if (result.kind === "conflict") {
    throw new ResourceConflictError(
      "The funding call changed. Refresh it before continuing.",
    );
  }
  return toFundingCallView(result.call);
}

type ReconciliationResult = {
  attempted: number;
  failed: number;
  transitioned: number;
};

async function reconcile(
  candidates: Array<{
    id: string;
    rowVersion: number;
    effectiveAt: Date;
  }>,
  command: "OPEN" | "CLOSE",
  now: Date,
): Promise<ReconciliationResult> {
  const results = await Promise.allSettled(candidates.map((candidate) =>
    transitionFundingCall({
      command,
      correlationId: crypto.randomUUID(),
      effectiveTime: candidate.effectiveAt,
      expectedRowVersion: candidate.rowVersion,
      fundingCallId: candidate.id,
      idempotencyKey:
        `funding-call:${candidate.id}:${command}:${candidate.effectiveAt.toISOString()}`,
      now,
      systemActor: "FUNDING_CALL_LIFECYCLE_SCHEDULER",
    })
  ));
  return {
    attempted: candidates.length,
    failed: results.filter((result) =>
      result.status === "rejected"
      || (result.status === "fulfilled"
        && !["replayed", "transitioned"].includes(result.value.kind))
    ).length,
    transitioned: results.filter((result) =>
      result.status === "fulfilled" && result.value.kind === "transitioned"
    ).length,
  };
}

export async function openScheduledFundingCalls(
  now = new Date(),
  limit = 100,
) {
  const due = await listScheduledFundingCallsDueToOpen(now, limit);
  return reconcile(due.map((call) => ({
    effectiveAt: call.opensAt,
    id: call.id,
    rowVersion: call.rowVersion,
  })), "OPEN", now);
}

export async function closeExpiredFundingCalls(
  now = new Date(),
  limit = 100,
) {
  const due = await listPublishedFundingCallsDueToClose(now, limit);
  return reconcile(due.map((call) => ({
    effectiveAt: call.closesAt,
    id: call.id,
    rowVersion: call.rowVersion,
  })), "CLOSE", now);
}

export async function reconcileFundingCallLifecycle(
  now = new Date(),
  limit = 100,
) {
  const [opening, closing] = await Promise.all([
    openScheduledFundingCalls(now, limit),
    closeExpiredFundingCalls(now, limit),
  ]);
  return { closing, opening };
}
