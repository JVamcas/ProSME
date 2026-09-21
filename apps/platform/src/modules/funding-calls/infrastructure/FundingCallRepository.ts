import "server-only";

import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  ilike,
  inArray,
  lt,
  lte,
  ne,
  or,
  sql,
} from "drizzle-orm";

import { getDatabase } from "@/db/client";
import type {
  FundingCallCreateInput,
  FundingCallUpdateInput,
} from "../api/FundingCallSchemas";
import type { FundingCall } from "../domain/FundingCall";
import { sanitizeFundingCallDescription } from "./FundingCallRichText";
import {
  fundingCallPublicDocuments,
  fundingCalls,
} from "./funding-call.schema";

function toFundingCall(row: typeof fundingCalls.$inferSelect): FundingCall {
  return {
    ...row,
    description: sanitizeFundingCallDescription(row.description),
  };
}

export async function insertFundingCall(
  actorId: string,
  input: FundingCallCreateInput,
): Promise<FundingCall> {
  const [created] = await getDatabase()
    .insert(fundingCalls)
    .values({
      ...input,
      closesAt: new Date(input.closesAt),
      createdBy: actorId,
      description: sanitizeFundingCallDescription(input.description),
      opensAt: new Date(input.opensAt),
      status: "DRAFT",
      updatedBy: actorId,
    })
    .returning();
  return toFundingCall(created);
}

export async function readFundingCallById(
  id: string,
): Promise<FundingCall | null> {
  const [row] = await getDatabase()
    .select()
    .from(fundingCalls)
    .where(eq(fundingCalls.id, id))
    .limit(1);
  return row ? toFundingCall(row) : null;
}

export async function readFundingCallByPublicIdentifier(
  identifier: string,
): Promise<FundingCall | null> {
  const [row] = await getDatabase()
    .select()
    .from(fundingCalls)
    .where(
      or(
        eq(fundingCalls.slug, identifier),
        eq(fundingCalls.reference, identifier),
      ),
    )
    .limit(1);
  return row ? toFundingCall(row) : null;
}

export async function updateDraftFundingCall(
  actorId: string,
  id: string,
  input: FundingCallUpdateInput,
): Promise<FundingCall | null> {
  const { expectedRowVersion, ...values } = input;
  const [updated] = await getDatabase()
    .update(fundingCalls)
    .set({
      ...values,
      closesAt: new Date(values.closesAt),
      description: sanitizeFundingCallDescription(values.description),
      opensAt: new Date(values.opensAt),
      rowVersion: expectedRowVersion + 1,
      updatedAt: new Date(),
      updatedBy: actorId,
    })
    .where(
      and(
        eq(fundingCalls.id, id),
        eq(fundingCalls.status, "DRAFT"),
        eq(fundingCalls.rowVersion, expectedRowVersion),
      ),
    )
    .returning();
  return updated ? toFundingCall(updated) : null;
}

type PublishedFundingCallQuery = {
  after?: { id: string; opensAt: Date };
  limit: number;
  search?: string;
  status?: "CLOSED" | "OPEN" | "SCHEDULED";
};

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
  status: "CLOSED" | "OPEN" | "SCHEDULED";
  thematicArea: string | null;
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

const publishedStatuses = ["SCHEDULED", "OPEN", "CLOSED"] as const;

const publicSelection = {
  closesAt: fundingCalls.closesAt,
  description: fundingCalls.description,
  eligibilitySummary: fundingCalls.eligibilitySummary,
  eligibilityRuleSetVersionId: fundingCalls.eligibilityRuleSetVersionId,
  fundingInstrument: fundingCalls.fundingInstrument,
  id: fundingCalls.id,
  maximumGrantAmount: fundingCalls.maximumGrantAmount,
  minimumGrantAmount: fundingCalls.minimumGrantAmount,
  opensAt: fundingCalls.opensAt,
  publicContactEmail: fundingCalls.publicContactEmail,
  publicContactName: fundingCalls.publicContactName,
  publicContactPhone: fundingCalls.publicContactPhone,
  reference: fundingCalls.reference,
  slug: fundingCalls.slug,
  status: sql<PublicFundingCallRecord["status"]>`${fundingCalls.status}`,
  thematicArea: fundingCalls.thematicArea,
  title: fundingCalls.title,
  totalBudgetEnvelope: fundingCalls.totalBudgetEnvelope,
};

function publishedConditions(input: PublishedFundingCallQuery) {
  const conditions = [
    input.status
      ? eq(fundingCalls.status, input.status)
      : inArray(fundingCalls.status, publishedStatuses),
  ];
  if (input.search) {
    conditions.push(
      or(
        ilike(fundingCalls.title, `%${input.search}%`),
        ilike(fundingCalls.description, `%${input.search}%`),
      )!,
    );
  }
  return conditions;
}

export async function readPublishedFundingCalls(
  input: PublishedFundingCallQuery,
) {
  const database = getDatabase();
  const baseConditions = publishedConditions(input);
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
      .select()
      .from(fundingCalls)
      .where(and(...baseConditions, cursorCondition))
      .orderBy(desc(fundingCalls.opensAt), desc(fundingCalls.id))
      .limit(input.limit + 1),
    database
      .select({ value: count() })
      .from(fundingCalls)
      .where(and(...baseConditions)),
  ]);
  return {
    items: rows.map(toFundingCall),
    total: totals[0]?.value ?? 0,
  };
}

export async function readPublishedFundingCall(
  id: string,
): Promise<FundingCall | null> {
  const [row] = await getDatabase()
    .select()
    .from(fundingCalls)
    .where(
      and(
        eq(fundingCalls.id, id),
        inArray(fundingCalls.status, publishedStatuses),
      ),
    )
    .limit(1);
  return row ? toFundingCall(row) : null;
}

function publicConditions(input: PublicFundingCallQuery) {
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
        eq(fundingCalls.status, "OPEN"),
        lte(fundingCalls.opensAt, input.now),
        gt(fundingCalls.closesAt, input.now),
      )!,
    );
  }
  if (input.status === "upcoming") {
    conditions.push(
      and(
        ne(fundingCalls.status, "CLOSED"),
        gt(fundingCalls.closesAt, input.now),
        or(
          gt(fundingCalls.opensAt, input.now),
          eq(fundingCalls.status, "SCHEDULED"),
        ),
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
  const conditions = publicConditions(input);
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
      .where(and(...conditions, cursorCondition))
      .orderBy(desc(fundingCalls.opensAt), desc(fundingCalls.id))
      .limit(input.limit + 1),
    database
      .select({ value: count() })
      .from(fundingCalls)
      .where(and(...conditions)),
  ]);
  return {
    items: rows.map((row) => ({
      ...row,
      description: sanitizeFundingCallDescription(row.description),
      publicDocuments: [],
    })),
    total: totals[0]?.value ?? 0,
  };
}

export async function readPublicFundingCallBySlug(
  slug: string,
): Promise<PublicFundingCallRecord | null> {
  const [row] = await getDatabase()
    .select(publicSelection)
    .from(fundingCalls)
    .where(
      and(
        eq(fundingCalls.slug, slug),
        inArray(fundingCalls.status, publishedStatuses),
      ),
    )
    .limit(1);
  if (!row) return null;
  return {
    ...row,
    description: sanitizeFundingCallDescription(row.description),
    publicDocuments: await readPublishedPublicDocuments(row.id),
  };
}

export async function readPublicFundingCallById(
  id: string,
): Promise<PublicFundingCallRecord | null> {
  const [row] = await getDatabase()
    .select(publicSelection)
    .from(fundingCalls)
    .where(
      and(
        eq(fundingCalls.id, id),
        inArray(fundingCalls.status, publishedStatuses),
      ),
    )
    .limit(1);
  if (!row) return null;
  return {
    ...row,
    description: sanitizeFundingCallDescription(row.description),
    publicDocuments: await readPublishedPublicDocuments(row.id),
  };
}

async function readPublishedPublicDocuments(fundingCallId: string) {
  return getDatabase()
    .select({
      label: fundingCallPublicDocuments.label,
      url: fundingCallPublicDocuments.url,
    })
    .from(fundingCallPublicDocuments)
    .where(
      and(
        eq(fundingCallPublicDocuments.fundingCallId, fundingCallId),
        lte(fundingCallPublicDocuments.publishedAt, new Date()),
      ),
    )
    .orderBy(
      asc(fundingCallPublicDocuments.displayOrder),
      asc(fundingCallPublicDocuments.id),
    );
}
