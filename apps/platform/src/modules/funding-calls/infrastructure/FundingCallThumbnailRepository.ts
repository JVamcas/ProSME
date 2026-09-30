import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { authorizationAuditEntries } from "@/db/schema";
import { fundingCalls } from "./funding-call.schema";

type ThumbnailMetadata = {
  contentType: string;
  fileName: string;
  objectKey: string;
} | null;

export async function updateFundingCallThumbnailRecord(input: {
  actorId: string;
  expectedRowVersion: number;
  fundingCallId: string;
  thumbnail: ThumbnailMetadata;
}) {
  return getDatabase().transaction(async (transaction) => {
    const [updated] = await transaction
      .update(fundingCalls)
      .set({
        rowVersion: sql`${fundingCalls.rowVersion} + 1`,
        thumbnailContentType: input.thumbnail?.contentType ?? null,
        thumbnailFileName: input.thumbnail?.fileName ?? null,
        thumbnailObjectKey: input.thumbnail?.objectKey ?? null,
        updatedAt: new Date(),
        updatedBy: input.actorId,
      })
      .where(and(
        eq(fundingCalls.id, input.fundingCallId),
        eq(fundingCalls.status, "DRAFT"),
        eq(fundingCalls.rowVersion, input.expectedRowVersion),
      ))
      .returning({ id: fundingCalls.id });
    if (!updated) return false;

    await transaction.insert(authorizationAuditEntries).values({
      action: input.thumbnail
        ? "funding_call.thumbnail.update"
        : "funding_call.thumbnail.remove",
      actorId: input.actorId,
      changes: {
        fileName: input.thumbnail?.fileName ?? null,
        fundingCallId: input.fundingCallId,
      },
    });
    return true;
  });
}
