import "server-only";
import { publishCallIntegrationBindings } from "@/modules/eligibility/infrastructure/EligibilityIntegrationVersionBindingRepository";

import { and, eq } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { transactionalOutbox } from "@/db/schema";
import { captureFundingCallNotification } from "./FundingCallNotificationRepository";
import type { FundingCall } from "../domain/FundingCall";
import { resolveFundingCallTransition } from "../domain/FundingCallLifecycle";
import { captureFundingCallPublication } from "../domain/FundingCallPublication";
import {
  fundingCallLifecycleHistory,
  fundingCallPublicationRevisions,
  fundingCalls,
} from "./funding-call.schema";
import { fundingCallDraftVersions } from "./funding-call-version.schema";
import { readWorkingFundingCall } from "./FundingCallVersionRepository";
import { fundingCallGovernanceReviews } from "./funding-call.schema";
import {
  readPublicationBindings,
  readPublicationDocumentsAndSequence,
} from "./FundingCallPublicationPreparationRepository";
import {
  sanitizeFundingCallDescription,
  sanitizeFundingCallEligibilitySummary,
} from "./FundingCallRichText";

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

function toFundingCall(row: FundingCall): FundingCall {
  return {
    ...row,
    description: sanitizeFundingCallDescription(row.description),
    eligibilitySummary: sanitizeFundingCallEligibilitySummary(
      row.eligibilitySummary,
    ),
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
    .where(
      and(
        eq(fundingCallLifecycleHistory.idempotencyKey, idempotencyKey),
        eq(fundingCallLifecycleHistory.fundingCallId, fundingCallId),
      ),
    )
    .limit(1);
  return row?.command === "PUBLISH" ? toFundingCall(row.call) : null;
}

export async function publishApprovedFundingCall(
  input: PublishFundingCallInput,
): Promise<PublishFundingCallResult> {
  return getDatabase().transaction(async (transaction) => {
    const [effective] = await transaction
      .select()
      .from(fundingCalls)
      .where(eq(fundingCalls.id, input.fundingCallId))
      .for("update")
      .limit(1);
    if (!effective) return { kind: "conflict" };
    const { call: current, draft } = await readWorkingFundingCall(
      transaction,
      effective,
    );

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
      return replay.command === "PUBLISH" &&
        replay.fundingCallId === input.fundingCallId
        ? { call: toFundingCall(current), kind: "replayed" }
        : { kind: "idempotency_conflict" };
    }
    if (
      current.status !== "APPROVED" ||
      current.rowVersion !== input.expectedRowVersion
    ) {
      return { kind: "conflict" };
    }

    if (effective.currentPublishedVersionId) {
      if (!draft || ["WITHDRAWN", "ARCHIVED"].includes(effective.status)) {
        return { kind: "conflict" };
      }
      const [approval] = await transaction
        .select({ id: fundingCallGovernanceReviews.id })
        .from(fundingCallGovernanceReviews)
        .where(
          and(
            eq(fundingCallGovernanceReviews.fundingCallId, current.id),
            eq(fundingCallGovernanceReviews.fundingCallVersionId, draft.id),
            eq(fundingCallGovernanceReviews.outcome, "APPROVED"),
          ),
        )
        .limit(1);
      if (!approval) return { kind: "conflict" };
    }
    const bindingsAvailable = await readPublicationBindings(
      transaction,
      current,
    );
    if (!bindingsAvailable) return { kind: "conflict" };
    const transition = resolveFundingCallTransition(
      current,
      "PUBLISH",
      input.now,
    );
    const targetStatus =
      effective.status === "SUSPENDED" ? "SUSPENDED" : transition.targetStatus;
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
        sourceStatus: effective.status,
        targetStatus,
      })
      .onConflictDoNothing({
        target: fundingCallLifecycleHistory.idempotencyKey,
      })
      .returning({ id: fundingCallLifecycleHistory.id });
    if (!history) return { kind: "idempotency_conflict" };

    const { publicDocuments, revisionNumber } =
      await readPublicationDocumentsAndSequence(
        transaction,
        input.fundingCallId,
      );
    const snapshot = captureFundingCallPublication(current, publicDocuments);
    const [revision] = await transaction
      .insert(fundingCallPublicationRevisions)
      .values({
        id: draft?.id,
        correlationId: input.correlationId,
        fundingCallId: input.fundingCallId,
        lifecycleHistoryId: history.id,
        publishedAt: input.now,
        publishedBy: input.actorId,
        publishedStatus: transition.targetStatus as "SCHEDULED" | "LIVE",
        revisionNumber,
        snapshot,
        sourceRowVersion: current.rowVersion,
      })
      .returning({ id: fundingCallPublicationRevisions.id });
    await publishCallIntegrationBindings(
      transaction,
      current.id,
      revision.id,
      current.workflowTemplateVersionId!,
    );

    const {
      opensAt,
      closesAt,
      publicDocuments: _documents,
      ...configuration
    } = snapshot;
    void _documents;
    const [updated] = await transaction
      .update(fundingCalls)
      .set({
        ...configuration,
        opensAt: new Date(opensAt),
        closesAt: new Date(closesAt),
        currentPublishedVersionId: revision.id,
        rowVersion: nextRowVersion,
        status: targetStatus,
        suspendedFromStatus:
          targetStatus === "SUSPENDED"
            ? (transition.targetStatus as "SCHEDULED" | "LIVE")
            : null,
        updatedAt: input.now,
        updatedBy: input.actorId,
      })
      .where(eq(fundingCalls.id, input.fundingCallId))
      .returning();
    if (draft) {
      await transaction
        .delete(fundingCallDraftVersions)
        .where(eq(fundingCallDraftVersions.id, draft.id));
    }

    const eventPayload = {
      fundingCallId: input.fundingCallId,
      publicationRevisionId: revision.id,
      publishedAt: input.now.toISOString(),
      status: targetStatus,
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
    await captureFundingCallNotification(transaction, {
      correlationId: input.correlationId,
      eventKey: "funding-call.published",
      fundingCallId: current.id,
      fundingCallReference: current.reference,
      fundingCallTitle: current.title,
      occurredAt: input.now,
      rowVersion: nextRowVersion,
      sourceIdempotencyKey: input.idempotencyKey,
      sourceStatus: effective.status,
      stakeholderUserIds: [current.createdBy],
      targetStatus,
    });
    return { call: toFundingCall(updated), kind: "published" };
  });
}
