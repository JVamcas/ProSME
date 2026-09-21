import "server-only";

import { and, eq, gt, sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import type { FundingCall } from "../domain/FundingCall";
import { fundingCalls } from "./funding-call.schema";
import { sanitizeFundingCallDescription } from "./FundingCallRichText";

export async function publishDraftFundingCall(
  actorId: string,
  id: string,
  expectedRowVersion: number,
  publishedAt: Date,
): Promise<FundingCall | null> {
  const [updated] = await getDatabase()
    .update(fundingCalls)
    .set({
      rowVersion: expectedRowVersion + 1,
      status: sql<"OPEN" | "SCHEDULED">`case
        when ${fundingCalls.opensAt} > ${publishedAt} then 'SCHEDULED'
        else 'OPEN'
      end`,
      updatedAt: publishedAt,
      updatedBy: actorId,
    })
    .where(and(
      eq(fundingCalls.id, id),
      eq(fundingCalls.status, "DRAFT"),
      eq(fundingCalls.rowVersion, expectedRowVersion),
      gt(fundingCalls.closesAt, publishedAt),
    ))
    .returning();
  return updated
    ? {
        ...updated,
        description: sanitizeFundingCallDescription(updated.description),
      }
    : null;
}
