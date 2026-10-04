import "server-only";

import { and, asc, eq, gt, inArray, lte } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { transactionalOutbox } from "@/db/schema";
import {
  captureFundingCallNotification,
  type FundingCallNotificationEventKey,
} from "./FundingCallNotificationRepository";
import type { FundingCall } from "../domain/FundingCall";
import {
  resolveFundingCallTransition,
  type FundingCallLifecycleCommand,
} from "../domain/FundingCallLifecycle";
import {
  fundingCallLifecycleHistory,
  fundingCalls,
} from "./funding-call.schema";
import {
  sanitizeFundingCallDescription,
  sanitizeFundingCallEligibilitySummary,
} from "./FundingCallRichText";

type LifecycleActor =
  | { actorId: string; systemActor?: never }
  | { actorId?: never; systemActor: string };

const notificationEvents: Partial<Record<
  FundingCallLifecycleCommand,
  FundingCallNotificationEventKey
>> = {
  ARCHIVE: "funding-call.archived",
  CLOSE: "funding-call.closed",
  OPEN: "funding-call.opened",
  RESUME: "funding-call.resumed",
  SUSPEND: "funding-call.suspended",
  WITHDRAW: "funding-call.withdrawn",
  WITHDRAW_FOR_AMENDMENT: "funding-call.returned-for-amendment",
};

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
    eligibilitySummary: sanitizeFundingCallEligibilitySummary(
      row.eligibilitySummary,
    ),
  };
}

export async function readFundingCallLifecycleReplay(
  fundingCallId: string,
  idempotencyKey: string,
  command: FundingCallLifecycleCommand,
) {
  const [row] = await getDatabase()
    .select({ call: fundingCalls, command: fundingCallLifecycleHistory.command })
    .from(fundingCallLifecycleHistory)
    .innerJoin(
      fundingCalls,
      eq(fundingCalls.id, fundingCallLifecycleHistory.fundingCallId),
    )
    .where(and(
      eq(fundingCallLifecycleHistory.idempotencyKey, idempotencyKey),
      eq(fundingCallLifecycleHistory.fundingCallId, fundingCallId),
    ))
    .limit(1);
  return row?.command === command ? toFundingCall(row.call) : null;
}

export function listScheduledFundingCallsDueToOpen(now: Date, limit: number) {
  return getDatabase()
    .select({
      closesAt: fundingCalls.closesAt,
      id: fundingCalls.id,
      opensAt: fundingCalls.opensAt,
      rowVersion: fundingCalls.rowVersion,
    })
    .from(fundingCalls)
    .where(and(
      eq(fundingCalls.status, "SCHEDULED"),
      lte(fundingCalls.opensAt, now),
      gt(fundingCalls.closesAt, now),
    ))
    .orderBy(asc(fundingCalls.opensAt), asc(fundingCalls.id))
    .limit(limit);
}

export function listPublishedFundingCallsDueToClose(now: Date, limit: number) {
  return getDatabase()
    .select({
      closesAt: fundingCalls.closesAt,
      id: fundingCalls.id,
      rowVersion: fundingCalls.rowVersion,
    })
    .from(fundingCalls)
    .where(and(
      inArray(fundingCalls.status, ["SCHEDULED", "LIVE", "SUSPENDED"]),
      lte(fundingCalls.closesAt, now),
    ))
    .orderBy(asc(fundingCalls.closesAt), asc(fundingCalls.id))
    .limit(limit);
}

export async function transitionFundingCall(
  input: FundingCallLifecycleInput,
): Promise<FundingCallLifecycleResult> {
  const reason = input.reason?.trim() || null;
  if (
    ["RETURN_FOR_AMENDMENT", "WITHDRAW_FOR_AMENDMENT"].includes(input.command)
    && !reason
  ) {
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
        updatedBy: input.command === "WITHDRAW_FOR_AMENDMENT"
          ? current.updatedBy
          : input.actorId ?? current.updatedBy,
      })
      .where(and(
        eq(fundingCalls.id, input.fundingCallId),
        eq(fundingCalls.rowVersion, input.expectedRowVersion),
        eq(fundingCalls.status, transition.sourceStatus),
      ))
      .returning();
    if (!updated) return { kind: "conflict" };

    const [history] = await transaction
      .insert(fundingCallLifecycleHistory)
      .values({
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
      })
      .returning({ id: fundingCallLifecycleHistory.id });
    const eventPayload = {
      command: input.command,
      fundingCallId: input.fundingCallId,
      occurredAt: input.now.toISOString(),
      sourceStatus: transition.sourceStatus,
      targetStatus: transition.targetStatus,
    };
    await transaction.insert(transactionalOutbox).values([
      {
        aggregateId: history.id,
        correlationId: input.correlationId,
        eventCode: "FUNDING_CALL_LIFECYCLE_CHANGED",
        payload: eventPayload,
        schemaVersion: 1,
      },
      {
        aggregateId: history.id,
        correlationId: input.correlationId,
        eventCode: "FUNDING_CALL_PUBLIC_CACHE_INVALIDATION_REQUESTED",
        payload: eventPayload,
        schemaVersion: 1,
      },
    ]);
    const notificationEvent = notificationEvents[input.command];
    if (notificationEvent) {
      await captureFundingCallNotification(transaction, {
        correlationId: input.correlationId,
        eventKey: notificationEvent,
        fundingCallId: current.id,
        fundingCallReference: current.reference,
        fundingCallTitle: current.title,
        occurredAt: input.now,
        reason,
        rowVersion: nextRowVersion,
        sourceIdempotencyKey: input.idempotencyKey,
        sourceStatus: transition.sourceStatus,
        stakeholderUserIds: [current.createdBy, current.updatedBy],
        targetStatus: transition.targetStatus,
      });
    }
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
