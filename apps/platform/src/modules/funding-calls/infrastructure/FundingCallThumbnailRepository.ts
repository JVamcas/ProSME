import "server-only";

import { eq, sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { authorizationAuditEntries } from "@/db/schema";
import {
  readWorkingFundingCall,
  updateWorkingFundingCall,
} from "./FundingCallVersionRepository";
import {
  fundingCallPublicationRevisions,
  fundingCalls,
} from "./funding-call.schema";

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
    const [effective] = await transaction
      .select()
      .from(fundingCalls)
      .where(eq(fundingCalls.id, input.fundingCallId))
      .for("update")
      .limit(1);
    if (!effective || effective.rowVersion !== input.expectedRowVersion)
      return false;
    const { call, draft } = await readWorkingFundingCall(
      transaction,
      effective,
    );
    if (call.status !== "DRAFT") return false;
    const values = {
      thumbnailContentType: input.thumbnail?.contentType ?? null,
      thumbnailFileName: input.thumbnail?.fileName ?? null,
      thumbnailObjectKey: input.thumbnail?.objectKey ?? null,
      updatedAt: new Date(),
      updatedBy: input.actorId,
    };
    if (draft) {
      await updateWorkingFundingCall(transaction, effective, draft, {
        ...call,
        ...values,
      });
    } else {
      await transaction
        .update(fundingCalls)
        .set({
          ...values,
          rowVersion: call.rowVersion + 1,
        })
        .where(eq(fundingCalls.id, call.id));
    }

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

export async function fundingCallThumbnailIsPublished(objectKey: string) {
  const [reference] = await getDatabase()
    .select({ id: fundingCallPublicationRevisions.id })
    .from(fundingCallPublicationRevisions)
    .where(
      sql`${fundingCallPublicationRevisions.snapshot}->>'thumbnailObjectKey' = ${objectKey}`,
    )
    .limit(1);
  return Boolean(reference);
}
