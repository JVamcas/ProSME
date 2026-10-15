import "server-only";
import type { DatabaseTransaction } from "@/platform/database/client";
import { transactionalOutbox } from "@/db/schema";
import type { FundingCall } from "../domain/FundingCall";
import type { PublishFundingCallInput } from "./FundingCallPublicationRepository";
import { captureFundingCallNotification } from "./FundingCallNotificationRepository";

export async function capturePublicationEffects(
  transaction: DatabaseTransaction,
  {
    input,
    current,
    revisionId,
    nextRowVersion,
    sourceStatus,
    targetStatus,
  }: {
    input: PublishFundingCallInput;
    current: FundingCall;
    revisionId: string;
    nextRowVersion: number;
    sourceStatus: FundingCall["status"];
    targetStatus: FundingCall["status"];
  },
) {
  const eventPayload = {
    fundingCallId: input.fundingCallId,
    publicationRevisionId: revisionId,
    publishedAt: input.now.toISOString(),
    status: targetStatus,
  };
  await transaction.insert(transactionalOutbox).values([
    {
      aggregateId: revisionId,
      correlationId: input.correlationId,
      eventCode: "FUNDING_CALL_PUBLIC_CACHE_INVALIDATION_REQUESTED",
      payload: eventPayload,
      schemaVersion: 1,
    },
    {
      aggregateId: revisionId,
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
    sourceStatus: sourceStatus,
    stakeholderUserIds: [current.createdBy],
    targetStatus,
  });
}
