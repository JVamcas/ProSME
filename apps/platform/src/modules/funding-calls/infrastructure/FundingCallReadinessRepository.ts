import "server-only";

import { and, asc, eq, or, sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import type { FundingCall } from "../domain/FundingCall";
import {
  fundingCallPublicDocuments,
  fundingCalls,
} from "./funding-call.schema";

export type FundingCallReadinessDocument = {
  finalized: boolean;
  id: string;
  label: string;
  markedForPublication: boolean;
  publishedAt: Date | null;
  securityCleared: boolean;
  url: string;
};

export function readFundingCallReadinessDocuments(
  fundingCallId: string,
): Promise<FundingCallReadinessDocument[]> {
  return getDatabase()
    .select({
      finalized: fundingCallPublicDocuments.finalized,
      id: fundingCallPublicDocuments.id,
      label: fundingCallPublicDocuments.label,
      markedForPublication: fundingCallPublicDocuments.markedForPublication,
      publishedAt: fundingCallPublicDocuments.publishedAt,
      securityCleared: fundingCallPublicDocuments.securityCleared,
      url: fundingCallPublicDocuments.url,
    })
    .from(fundingCallPublicDocuments)
    .where(eq(fundingCallPublicDocuments.fundingCallId, fundingCallId))
    .orderBy(asc(fundingCallPublicDocuments.displayOrder));
}

export async function readFundingCallIdentifierConflicts(
  call: Pick<FundingCall, "id" | "reference" | "slug">,
) {
  const rows = await getDatabase()
    .select({
      reference: fundingCalls.reference,
      slug: fundingCalls.slug,
    })
    .from(fundingCalls)
    .where(and(
      or(
        eq(fundingCalls.reference, call.reference),
        eq(fundingCalls.slug, call.slug),
      ),
      sql`${fundingCalls.id} <> ${call.id}`,
    ));
  return {
    reference: rows.some((row) => row.reference === call.reference),
    slug: rows.some((row) => row.slug === call.slug),
  };
}
