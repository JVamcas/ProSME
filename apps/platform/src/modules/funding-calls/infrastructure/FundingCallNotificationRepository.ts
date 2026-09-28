import "server-only";

import { inArray } from "drizzle-orm";

import { users } from "@/db/schema/identity";
import { captureNotificationOccurrence } from "@/modules/notifications/application/ServerNotificationOccurrenceService";
import type { NotificationEventKey } from "@/modules/notifications/domain/NotificationEvent";
import type { NotificationOccurrenceTransaction } from "@/modules/notifications/infrastructure/NotificationOccurrenceRepository";
import type { FundingCallStatus } from "../domain/FundingCall";

export type FundingCallNotificationEventKey = Extract<
  NotificationEventKey,
  `funding-call.${string}`
>;

export async function captureFundingCallNotification(
  transaction: NotificationOccurrenceTransaction,
  input: {
    correlationId: string;
    eventKey: FundingCallNotificationEventKey;
    excludedRecipientUserIds?: string[];
    fundingCallId: string;
    fundingCallReference: string;
    fundingCallTitle: string;
    occurredAt: Date;
    reason?: string | null;
    rowVersion: number;
    sourceIdempotencyKey: string;
    sourceStatus: FundingCallStatus;
    stakeholderUserIds?: string[];
    targetStatus: FundingCallStatus;
  },
) {
  const stakeholderIds = [...new Set(input.stakeholderUserIds ?? [])];
  const stakeholders = stakeholderIds.length
    ? await transaction
        .select({
          displayName: users.displayName,
          email: users.email,
          userId: users.id,
        })
        .from(users)
        .where(inArray(users.id, stakeholderIds))
    : [];
  return captureNotificationOccurrence(transaction, {
    aggregateId: input.fundingCallId,
    aggregateType: "FUNDING_CALL",
    context: {
      correlationId: input.correlationId,
      excludedRecipientUserIds: [
        ...new Set(input.excludedRecipientUserIds ?? []),
      ],
      fundingCallId: input.fundingCallId,
      fundingCallReference: input.fundingCallReference,
      fundingCallTitle: input.fundingCallTitle,
      occurredAt: input.occurredAt.toISOString(),
      reason: input.reason?.trim() || null,
      sourceIdempotencyKey: input.sourceIdempotencyKey,
      sourceStatus: input.sourceStatus,
      targetStatus: input.targetStatus,
    },
    correlationId: input.correlationId,
    eventKey: input.eventKey,
    occurrenceKey: `${input.fundingCallId}:${input.eventKey}:${input.rowVersion}`,
    recipients: stakeholders.map((stakeholder) => ({
      ...stakeholder,
      recipientType: "FUNDING_CALL_STAKEHOLDER" as const,
      resolutionPath: "funding-call:lifecycle-stakeholder",
    })),
  });
}
