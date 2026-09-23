import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { transactionalOutbox } from "@/db/schema";
import type { FundingCall } from "../domain/FundingCall";
import { resolveFundingCallTransition } from "../domain/FundingCallLifecycle";
import { captureFundingCallPublication } from "../domain/FundingCallPublication";
import {
  fundingCallLifecycleHistory,
  fundingCallPublicationRevisions,
  fundingCallPublicDocuments,
  fundingCalls,
} from "./funding-call.schema";
import { sanitizeFundingCallDescription } from "./FundingCallRichText";

export type PublishFundingCallInput = {
  actorId: string;
  correlationId: string;
  expectedRowVersion: number;
  fundingCallId: string;
  idempotencyKey: string;
  now: Date;
};

export type PublishFundingCallResult =
  | { call: FundingCall; kind: "replayed" | "published" }
  | { kind: "conflict" }
  | { kind: "idempotency_conflict" };

function toFundingCall(row: typeof fundingCalls.$inferSelect): FundingCall {
  return {
    ...row,
    description: sanitizeFundingCallDescription(row.description),
  };
}

export async function readFundingCallPublicationReplay(
  fundingCallId: string,
  idempotencyKey: string,
): Promise<FundingCall | null> {
  const [row] = await getDatabase()
    .select({
      call: fundingCalls,
      command: fundingCallLifecycleHistory.command,
    })
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
  return row?.command === "PUBLISH" ? toFundingCall(row.call) : null;
}

export async function publishDraftFundingCall(
  input: PublishFundingCallInput,
): Promise<PublishFundingCallResult> {
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
      .where(
        eq(fundingCallLifecycleHistory.idempotencyKey, input.idempotencyKey),
      )
      .limit(1);
    if (replay) {
      return replay.command === "PUBLISH"
        && replay.fundingCallId === input.fundingCallId
        ? { call: toFundingCall(current), kind: "replayed" }
        : { kind: "idempotency_conflict" };
    }
    if (
      current.status !== "DRAFT"
      || current.rowVersion !== input.expectedRowVersion
    ) {
      return { kind: "conflict" };
    }

    const transition = resolveFundingCallTransition(
      current,
      "PUBLISH",
      input.now,
    );
    const nextRowVersion = current.rowVersion + 1;
    const [history] = await transaction
      .insert(fundingCallLifecycleHistory)
      .values({
        actorId: input.actorId,
        command: "PUBLISH",
        commandTime: input.now,
        correlationId: input.correlationId,
        effectiveTime: input.now,
        fundingCallId: input.fundingCallId,
        idempotencyKey: input.idempotencyKey,
        rowVersion: nextRowVersion,
        sourceStatus: current.status,
        targetStatus: transition.targetStatus,
      })
      .onConflictDoNothing({
        target: fundingCallLifecycleHistory.idempotencyKey,
      })
      .returning({ id: fundingCallLifecycleHistory.id });
    if (!history) return { kind: "idempotency_conflict" };

    const publicDocuments = await transaction
      .select({
        label: fundingCallPublicDocuments.label,
        url: fundingCallPublicDocuments.url,
      })
      .from(fundingCallPublicDocuments)
      .where(and(
        eq(fundingCallPublicDocuments.fundingCallId, input.fundingCallId),
        eq(fundingCallPublicDocuments.markedForPublication, true),
      ))
      .orderBy(
        asc(fundingCallPublicDocuments.displayOrder),
        asc(fundingCallPublicDocuments.id),
      );
    const [revision] = await transaction
      .insert(fundingCallPublicationRevisions)
      .values({
        correlationId: input.correlationId,
        fundingCallId: input.fundingCallId,
        lifecycleHistoryId: history.id,
        publishedAt: input.now,
        publishedBy: input.actorId,
        publishedStatus: transition.targetStatus as "SCHEDULED" | "LIVE",
        revisionNumber: 1,
        snapshot: captureFundingCallPublication(
          toFundingCall(current),
          publicDocuments,
        ),
        sourceRowVersion: current.rowVersion,
      })
      .returning({ id: fundingCallPublicationRevisions.id });

    const [updated] = await transaction
      .update(fundingCalls)
      .set({
        rowVersion: nextRowVersion,
        status: transition.targetStatus,
        suspendedFromStatus: null,
        updatedAt: input.now,
        updatedBy: input.actorId,
      })
      .where(and(
        eq(fundingCalls.id, input.fundingCallId),
        eq(fundingCalls.rowVersion, input.expectedRowVersion),
        eq(fundingCalls.status, "DRAFT"),
      ))
      .returning();
    if (!updated) return { kind: "conflict" };

    const eventPayload = {
      fundingCallId: input.fundingCallId,
      publicationRevisionId: revision.id,
      publishedAt: input.now.toISOString(),
      status: transition.targetStatus,
    };
    await transaction.insert(transactionalOutbox).values([
      {
        aggregateId: revision.id,
        correlationId: input.correlationId,
        eventCode: "FUNDING_CALL_PUBLIC_CACHE_INVALIDATION_REQUESTED",
        payload: eventPayload,
        schemaVersion: 1,
      },
      {
        aggregateId: revision.id,
        correlationId: input.correlationId,
        eventCode: "FUNDING_CALL_PUBLICATION_NOTIFICATION_REQUESTED",
        payload: eventPayload,
        schemaVersion: 1,
      },
    ]);
    return { call: toFundingCall(updated), kind: "published" };
  });
}
