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
import type { FundingCallGovernanceCommandInput } from "../api/FundingCallSchemas";
import type { FundingCallView } from "../api/FundingCallTransport";
import type { FundingCall } from "../domain/FundingCall";
import { changeFundingCallGovernance } from "../infrastructure/FundingCallGovernanceRepository";
import { readFundingCallById } from "../infrastructure/FundingCallRepository";
import { validateFundingCallReadiness } from "./ServerFundingCallReadinessService";

const commandPermissions = {
  APPROVE: permissionCodes.fundingCallApproveAll,
  RETURN_FOR_AMENDMENT: permissionCodes.fundingCallReturnAll,
  SUBMIT_FOR_APPROVAL: permissionCodes.fundingCallSubmitAll,
  WITHDRAW_APPROVAL_REQUEST:
    permissionCodes.fundingCallApprovalRequestOwnWithdraw,
} as const;

const sourceStatuses = {
  APPROVE: "APPROVAL_PENDING",
  RETURN_FOR_AMENDMENT: "APPROVAL_PENDING",
  SUBMIT_FOR_APPROVAL: "DRAFT",
  WITHDRAW_APPROVAL_REQUEST: "APPROVAL_PENDING",
} as const;

function view(call: FundingCall): FundingCallView {
  return {
    ...call,
    closesAt: call.closesAt.toISOString(),
    createdAt: call.createdAt.toISOString(),
    opensAt: call.opensAt.toISOString(),
    updatedAt: call.updatedAt.toISOString(),
  };
}

function conflictMessage(command: FundingCallGovernanceCommandInput["command"]) {
  if (command === "SUBMIT_FOR_APPROVAL") {
    return "Only a current draft funding call can be submitted for approval.";
  }
  if (command === "APPROVE") {
    return "Only a current pending funding call can be approved.";
  }
  if (command === "RETURN_FOR_AMENDMENT") {
    return "Only a current pending funding call can be returned for amendment.";
  }
  return "Only the current approval request can be withdrawn.";
}

async function requireReady(call: FundingCall, now: Date) {
  const readiness = await validateFundingCallReadiness(call, now);
  if (readiness.ready) return;
  const first = readiness.issues[0];
  throw new RequestValidationError(
    `Funding call readiness failed (${first.code}): ${first.message}`,
  );
}

export async function changeFundingCallGovernanceStatus(
  user: AuthenticatedUser | null,
  fundingCallId: string,
  input: FundingCallGovernanceCommandInput,
  idempotencyKey: string,
  correlationId: string,
): Promise<FundingCallView> {
  const actor = requirePermission(user, commandPermissions[input.command]);
  const call = await readFundingCallById(fundingCallId);
  if (!call) throw new ResourceNotFoundError("funding call");
  if (
    call.status !== sourceStatuses[input.command]
    || call.rowVersion !== input.expectedRowVersion
  ) {
    throw new ResourceConflictError(conflictMessage(input.command));
  }

  const now = new Date();
  if (
    input.command === "SUBMIT_FOR_APPROVAL"
    || input.command === "APPROVE"
  ) {
    await requireReady(call, now);
  }

  const result = await changeFundingCallGovernance({
    actorId: actor.id,
    command: input.command,
    correlationId,
    expectedRowVersion: input.expectedRowVersion,
    fundingCallId,
    idempotencyKey,
    now,
    reason: "reason" in input ? input.reason : undefined,
  });
  if (result.kind === "idempotency_conflict") {
    throw new IdempotencyConflictError(
      "The idempotency key was already used for another command.",
    );
  }
  if (result.kind === "maker_checker_conflict") {
    throw new ResourceConflictError(
      "The funding call creator or last material editor cannot approve it.",
    );
  }
  if (result.kind === "not_submitter") {
    throw new ResourceConflictError(
      "Only the submitter can withdraw this approval request.",
    );
  }
  if (result.kind === "withdrawal_disabled") {
    throw new ResourceConflictError(
      "Approval request withdrawal is disabled by governance policy.",
    );
  }
  if (result.kind === "conflict") {
    throw new ResourceConflictError(conflictMessage(input.command));
  }
  if (!("call" in result)) {
    throw new ResourceConflictError(conflictMessage(input.command));
  }
  return view(result.call);
}
