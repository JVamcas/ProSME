import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import type { FundingCall } from "../domain/FundingCall";
import {
  resolveFundingCallTransition,
  type FundingCallLifecycleCommand,
} from "../domain/FundingCallLifecycle";
import {
  fundingCallLifecycleHistory,
  fundingCalls,
} from "./funding-call.schema";
import { sanitizeFundingCallDescription } from "./FundingCallRichText";

type LifecycleActor =
  | { actorId: string; systemActor?: never }
  | { actorId?: never; systemActor: string };

export type FundingCallLifecycleInput = LifecycleActor & {
  command: Exclude<FundingCallLifecycleCommand, "PUBLISH">;
  correlationId: string;
  effectiveTime?: Date;
  expectedRowVersion: number;
  fundingCallId: string;
  idempotencyKey: string;
  now: Date;
  reason?: string;
};

export type FundingCallLifecycleResult =
  | { call: FundingCall; kind: "replayed" | "transitioned" }
  | { kind: "conflict" }
  | { kind: "idempotency_conflict" };

function toFundingCall(row: typeof fundingCalls.$inferSelect): FundingCall {
  return {
    ...row,
    description: sanitizeFundingCallDescription(row.description),
  };
}

export async function transitionFundingCall(
  input: FundingCallLifecycleInput,
): Promise<FundingCallLifecycleResult> {
  const reason = input.reason?.trim() || null;
  if (input.command === "RETURN_FOR_AMENDMENT" && !reason) {
    throw new Error("A reason is required to return a funding call to Draft.");
  }
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

    const transition = resolveFundingCallTransition(current, input.command, input.now);
    const nextRowVersion = current.rowVersion + 1;
    const [updated] = await transaction
      .update(fundingCalls)
      .set({
        rowVersion: nextRowVersion,
        status: transition.targetStatus,
        suspendedFromStatus: transition.suspendedFromStatus,
        updatedAt: input.now,
        updatedBy: input.actorId ?? current.updatedBy,
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
      effectiveTime: input.effectiveTime ?? input.now,
      fundingCallId: input.fundingCallId,
      idempotencyKey: input.idempotencyKey,
      reason,
      rowVersion: nextRowVersion,
      sourceStatus: transition.sourceStatus,
      systemActor: input.systemActor,
      targetStatus: transition.targetStatus,
    });
    return { call: toFundingCall(updated), kind: "transitioned" };
  });
}

export function readFundingCallLifecycleHistory(fundingCallId: string) {
  return getDatabase()
    .select()
    .from(fundingCallLifecycleHistory)
    .where(eq(fundingCallLifecycleHistory.fundingCallId, fundingCallId))
    .orderBy(
      asc(fundingCallLifecycleHistory.commandTime),
      asc(fundingCallLifecycleHistory.id),
    );
}
