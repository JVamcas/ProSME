import "server-only";

import { and, count, desc, eq, gt, ilike, inArray, lt, lte, or, sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import type { FundingCallPublicationSnapshot } from "../domain/FundingCallPublication";
import { fundingCallPublicationRevisions, fundingCalls } from "./funding-call.schema";
import {
  sanitizeFundingCallDescription,
  sanitizeFundingCallEligibilitySummary,
} from "./FundingCallRichText";

export type PublicFundingCallRecord = {
  closesAt: Date;
  description: string;
  eligibilitySummary: string | null;
  eligibilityRuleSetVersionId: string | null;
  fundingInstrument: string | null;
  id: string;
  maximumGrantAmount: string;
  minimumGrantAmount: string;
  opensAt: Date;
  publicContactEmail: string | null;
  publicContactName: string | null;
  publicContactPhone: string | null;
  reference: string;
  slug: string;
  status: "CLOSED" | "LIVE" | "SCHEDULED";
  thematicArea: string | null;
  thumbnailContentType?: string | null;
  thumbnailFileName?: string | null;
  thumbnailObjectKey?: string | null;
  title: string;
  totalBudgetEnvelope: string;
  publicDocuments: { label: string; url: string }[];
};

export type PublicFundingCallQuery = {
  after?: { id: string; opensAt: Date };
  limit: number;
  now: Date;
  search?: string;
  status?: "closed" | "open" | "upcoming";
};

const publishedStatuses = ["SCHEDULED", "LIVE", "CLOSED"] as const;

function latestPublicationCondition() {
  return and(
    eq(fundingCallPublicationRevisions.fundingCallId, fundingCalls.id),
    eq(
      fundingCallPublicationRevisions.revisionNumber,
      sql<number>`(
        select max(revision.revision_number)
        from app_funding_call_publication_revisions revision
        where revision.funding_call_id = ${fundingCalls.id}
      )`,
    ),
  );
}

const publicSelection = {
  id: fundingCalls.id,
  snapshot: fundingCallPublicationRevisions.snapshot,
  status: sql<PublicFundingCallRecord["status"]>`${fundingCalls.status}`,
};

type PublicFundingCallSelection = {
  id: string;
  snapshot: FundingCallPublicationSnapshot;
  status: PublicFundingCallRecord["status"];
};

function toPublicFundingCallRecord(
  row: PublicFundingCallSelection,
): PublicFundingCallRecord {
  return {
    ...row.snapshot,
    closesAt: new Date(row.snapshot.closesAt),
    description: sanitizeFundingCallDescription(row.snapshot.description),
    eligibilitySummary: sanitizeFundingCallEligibilitySummary(
      row.snapshot.eligibilitySummary,
    ),
    id: row.id,
    opensAt: new Date(row.snapshot.opensAt),
    status: row.status,
  };
}

export function publicFundingCallConditions(input: PublicFundingCallQuery) {
  const conditions = [inArray(fundingCalls.status, publishedStatuses)];
  if (input.search) {
    conditions.push(
      or(
        ilike(fundingCalls.reference, `%${input.search}%`),
        ilike(fundingCalls.title, `%${input.search}%`),
        ilike(fundingCalls.description, `%${input.search}%`),
      )!,
    );
  }
  if (input.status === "open") {
    conditions.push(
      and(
        inArray(fundingCalls.status, ["SCHEDULED", "LIVE"]),
        lte(fundingCalls.opensAt, input.now),
        gt(fundingCalls.closesAt, input.now),
      )!,
    );
  }
  if (input.status === "upcoming") {
    conditions.push(
      and(
        eq(fundingCalls.status, "SCHEDULED"),
        gt(fundingCalls.opensAt, input.now),
        gt(fundingCalls.closesAt, input.now),
      )!,
    );
  }
  if (input.status === "closed") {
    conditions.push(
      or(
        eq(fundingCalls.status, "CLOSED"),
        lte(fundingCalls.closesAt, input.now),
      )!,
    );
  }
  return conditions;
}

export async function readPublicFundingCalls(
  input: PublicFundingCallQuery,
): Promise<{ items: PublicFundingCallRecord[]; total: number }> {
  const database = getDatabase();
  const conditions = publicFundingCallConditions(input);
  const cursorCondition = input.after
    ? or(
        lt(fundingCalls.opensAt, input.after.opensAt),
        and(
          eq(fundingCalls.opensAt, input.after.opensAt),
          lt(fundingCalls.id, input.after.id),
        ),
      )
    : undefined;
  const [rows, totals] = await Promise.all([
    database
      .select(publicSelection)
      .from(fundingCalls)
      .innerJoin(
        fundingCallPublicationRevisions,
        latestPublicationCondition(),
      )
      .where(and(...conditions, cursorCondition))
      .orderBy(desc(fundingCalls.opensAt), desc(fundingCalls.id))
      .limit(input.limit + 1),
    database
      .select({ value: count() })
      .from(fundingCalls)
      .innerJoin(
        fundingCallPublicationRevisions,
        latestPublicationCondition(),
      )
      .where(and(...conditions)),
  ]);
  return {
    items: rows.map(toPublicFundingCallRecord),
    total: totals[0]?.value ?? 0,
  };
}

export async function readPublicFundingCallBySlug(
  slug: string,
): Promise<PublicFundingCallRecord | null> {
  const [row] = await getDatabase()
    .select(publicSelection)
    .from(fundingCalls)
    .innerJoin(
      fundingCallPublicationRevisions,
      latestPublicationCondition(),
    )
    .where(
      and(
        eq(fundingCalls.slug, slug),
        inArray(fundingCalls.status, publishedStatuses),
      ),
    )
    .limit(1);
  if (!row) return null;
  return toPublicFundingCallRecord(row);
}

export async function readPublicFundingCallById(
  id: string,
): Promise<PublicFundingCallRecord | null> {
  const [row] = await getDatabase()
    .select(publicSelection)
    .from(fundingCalls)
    .innerJoin(
      fundingCallPublicationRevisions,
      latestPublicationCondition(),
    )
    .where(
      and(
        eq(fundingCalls.id, id),
        inArray(fundingCalls.status, publishedStatuses),
      ),
    )
    .limit(1);
  if (!row) return null;
  return toPublicFundingCallRecord(row);
}
