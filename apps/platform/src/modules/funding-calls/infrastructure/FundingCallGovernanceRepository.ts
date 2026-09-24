import "server-only";

import { and, eq } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import type { FundingCall } from "../domain/FundingCall";
import { createFundingCallGovernanceSnapshot } from "../domain/FundingCallGovernance";
import {
  canApproveFundingCall,
  fundingCallWithdrawalDenial,
} from "../domain/FundingCallGovernancePolicy";
import {
  resolveFundingCallTransition,
  type FundingCallLifecycleCommand,
} from "../domain/FundingCallLifecycle";
import {
  fundingCallGovernancePolicy,
  fundingCallGovernanceReviews,
  fundingCallLifecycleHistory,
  fundingCalls,
} from "./funding-call.schema";
import { sanitizeFundingCallDescription } from "./FundingCallRichText";

type GovernanceCommand = Extract<
  FundingCallLifecycleCommand,
  | "APPROVE"
  | "RETURN_FOR_AMENDMENT"
  | "SUBMIT_FOR_APPROVAL"
  | "WITHDRAW_APPROVAL_REQUEST"
>;

export type FundingCallGovernanceInput = {
  actorId: string;
  command: GovernanceCommand;
  correlationId: string;
  expectedRowVersion: number;
  fundingCallId: string;
  idempotencyKey: string;
  now: Date;
  reason?: string;
};

export type FundingCallGovernanceResult =
  | { call: FundingCall; kind: "replayed" | "transitioned" }
  | {
      kind:
        | "conflict"
        | "idempotency_conflict"
        | "maker_checker_conflict"
        | "not_submitter"
        | "withdrawal_disabled";
    };

function toFundingCall(row: typeof fundingCalls.$inferSelect): FundingCall {
  return {
    ...row,
    description: sanitizeFundingCallDescription(row.description),
  };
}

function outcome(command: GovernanceCommand) {
  if (command === "APPROVE") return "APPROVED" as const;
  if (command === "RETURN_FOR_AMENDMENT") return "RETURNED" as const;
  if (command === "WITHDRAW_APPROVAL_REQUEST") return "WITHDRAWN" as const;
  return null;
}

export async function changeFundingCallGovernance(
  input: FundingCallGovernanceInput,
): Promise<FundingCallGovernanceResult> {
  const reason = input.reason?.trim() || null;
  return getDatabase().transaction(async (transaction) => {
    const [current] = await transaction
      .select()
      .from(fundingCalls)
      .where(eq(fundingCalls.id, input.fundingCallId))
      .for("update")
      .limit(1);
    if (!current) return { kind: "conflict" };

    const [replay] = await transaction
      .select({
        command: fundingCallLifecycleHistory.command,
        fundingCallId: fundingCallLifecycleHistory.fundingCallId,
      })
      .from(fundingCallLifecycleHistory)
      .where(eq(fundingCallLifecycleHistory.idempotencyKey, input.idempotencyKey))
      .limit(1);
    if (replay) {
      return replay.command === input.command
          && replay.fundingCallId === input.fundingCallId
        ? { call: toFundingCall(current), kind: "replayed" }
        : { kind: "idempotency_conflict" };
    }
    if (current.rowVersion !== input.expectedRowVersion) {
      return { kind: "conflict" };
    }

    const transition = resolveFundingCallTransition(
      current,
      input.command,
      input.now,
    );
    const [policy] = await transaction
      .select()
      .from(fundingCallGovernancePolicy)
      .where(eq(fundingCallGovernancePolicy.id, 1))
      .limit(1);
    if (!policy) throw new Error("Funding call governance policy is missing.");

    const [pendingReview] = input.command === "SUBMIT_FOR_APPROVAL"
      ? []
      : await transaction
          .select()
          .from(fundingCallGovernanceReviews)
          .where(and(
            eq(fundingCallGovernanceReviews.fundingCallId, input.fundingCallId),
            eq(fundingCallGovernanceReviews.outcome, "PENDING"),
          ))
          .for("update")
          .limit(1);
    if (input.command !== "SUBMIT_FOR_APPROVAL" && !pendingReview) {
      return { kind: "conflict" };
    }
    if (
      input.command === "APPROVE"
      && !canApproveFundingCall(input.actorId, policy, pendingReview!)
    ) {
      return { kind: "maker_checker_conflict" };
    }
    if (input.command === "WITHDRAW_APPROVAL_REQUEST") {
      const denial = fundingCallWithdrawalDenial(
        input.actorId,
        policy,
        pendingReview!,
      );
      if (denial) return { kind: denial };
    }

    const nextRowVersion = current.rowVersion + 1;
    const [updated] = await transaction
      .update(fundingCalls)
      .set({
        rowVersion: nextRowVersion,
        status: transition.targetStatus,
        suspendedFromStatus: transition.suspendedFromStatus,
        updatedAt: input.now,
      })
      .where(and(
        eq(fundingCalls.id, input.fundingCallId),
        eq(fundingCalls.rowVersion, input.expectedRowVersion),
        eq(fundingCalls.status, transition.sourceStatus),
      ))
      .returning();
    if (!updated) return { kind: "conflict" };

    await transaction.insert(fundingCallLifecycleHistory).values({
      actorId: input.actorId,
      command: input.command,
      commandTime: input.now,
      correlationId: input.correlationId,
      effectiveTime: input.now,
      fundingCallId: input.fundingCallId,
      idempotencyKey: input.idempotencyKey,
      reason,
      rowVersion: nextRowVersion,
      sourceStatus: transition.sourceStatus,
      targetStatus: transition.targetStatus,
    });

    if (input.command === "SUBMIT_FOR_APPROVAL") {
      await transaction.insert(fundingCallGovernanceReviews).values({
        configurationSnapshot: createFundingCallGovernanceSnapshot(
          toFundingCall(current),
        ),
        creatorId: current.createdBy,
        fundingCallId: current.id,
        materialEditorId: current.updatedBy,
        submittedAt: input.now,
        submittedBy: input.actorId,
        submittedRowVersion: current.rowVersion,
      });
    } else {
      await transaction
        .update(fundingCallGovernanceReviews)
        .set({
          decidedAt: input.now,
          decidedBy: input.actorId,
          decisionRowVersion: nextRowVersion,
          outcome: outcome(input.command)!,
          reason,
        })
        .where(and(
          eq(fundingCallGovernanceReviews.id, pendingReview!.id),
          eq(fundingCallGovernanceReviews.outcome, "PENDING"),
        ));
    }
    return { call: toFundingCall(updated), kind: "transitioned" };
  });
}
