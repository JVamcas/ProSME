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
import type { FundingCallPublishInput } from "../api/FundingCallSchemas";
import type { FundingCallView } from "../api/FundingCallTransport";
import type { FundingCall } from "../domain/FundingCall";
import {
  publishApprovedFundingCall,
  readFundingCallPublicationReplay,
} from "../infrastructure/FundingCallPublicationRepository";
import { readFundingCallById } from "../infrastructure/FundingCallRepository";
import { validateFundingCallReadiness } from "./ServerFundingCallReadinessService";

function view(call: FundingCall): FundingCallView {
  return {
    ...call,
    closesAt: call.closesAt.toISOString(),
    createdAt: call.createdAt.toISOString(),
    opensAt: call.opensAt.toISOString(),
    updatedAt: call.updatedAt.toISOString(),
  };
}

export async function publishFundingCall(
  user: AuthenticatedUser | null,
  id: string,
  input: FundingCallPublishInput,
  idempotencyKey: string,
  correlationId: string,
): Promise<FundingCallView> {
  const actor = requirePermission(user, permissionCodes.fundingCallPublish);
  const replay = await readFundingCallPublicationReplay(id, idempotencyKey);
  if (replay) return view(replay);

  const call = await readFundingCallById(id);
  if (!call) throw new ResourceNotFoundError("funding call");
  if (
    call.status !== "APPROVED"
    || call.rowVersion !== input.expectedRowVersion
  ) {
    throw new ResourceConflictError(
      call.status === "APPROVED"
        ? "The funding call changed. Refresh it before publishing."
        : "Only approved funding calls can be published.",
    );
  }

  const now = new Date();
  const readiness = await validateFundingCallReadiness(call, now);
  if (!readiness.ready) {
    const first = readiness.issues[0];
    throw new RequestValidationError(
      `Publication readiness failed (${first.code}): ${first.message}`,
    );
  }
  const result = await publishApprovedFundingCall({
    actorId: actor.id,
    correlationId,
    expectedRowVersion: input.expectedRowVersion,
    fundingCallId: id,
    idempotencyKey,
    now,
  });
  if (result.kind === "idempotency_conflict") {
    throw new IdempotencyConflictError(
      "The idempotency key was already used for another command.",
    );
  }
  if (result.kind === "conflict") {
    throw new ResourceConflictError(
      "The funding call changed. Refresh it before publishing.",
    );
  }
  return view(result.call);
}
