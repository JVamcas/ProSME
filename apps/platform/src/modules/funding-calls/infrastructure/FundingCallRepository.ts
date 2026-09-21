import "server-only";

import { and, count, desc, eq, ilike, inArray, lt, or } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import type {
  FundingCallCreateInput,
  FundingCallListInput,
  FundingCallUpdateInput,
} from "../api/FundingCallSchemas";
import type { FundingCall } from "../domain/FundingCall";
import { sanitizeFundingCallDescription } from "./FundingCallRichText";
import { fundingCalls } from "./funding-call.schema";

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

export async function readFundingCalls(input: FundingCallListInput) {
  const database = getDatabase();
  const offset = (input.page - 1) * input.pageSize;
  const [rows, totals] = await Promise.all([
    database
      .select()
      .from(fundingCalls)
      .orderBy(desc(fundingCalls.updatedAt), desc(fundingCalls.id))
      .limit(input.pageSize)
      .offset(offset),
    database.select({ value: count() }).from(fundingCalls),
  ]);
  const total = totals[0]?.value ?? 0;
  return {
    items: rows.map(toFundingCall),
    page: input.page,
    pageSize: input.pageSize,
    total,
    totalPages: Math.ceil(total / input.pageSize),
  };
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

const publishedStatuses = ["SCHEDULED", "OPEN", "CLOSED"] as const;

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

export async function readPublicFundingCalls(): Promise<FundingCall[]> {
  const rows = await getDatabase()
    .select()
    .from(fundingCalls)
    .where(inArray(fundingCalls.status, publishedStatuses))
    .orderBy(desc(fundingCalls.opensAt), desc(fundingCalls.id))
    .limit(20);
  return rows.map(toFundingCall);
}

export async function readPublicFundingCallBySlug(
  slug: string,
): Promise<FundingCall | null> {
  const [row] = await getDatabase()
    .select()
    .from(fundingCalls)
    .where(
      and(
        eq(fundingCalls.slug, slug),
        inArray(fundingCalls.status, publishedStatuses),
      ),
    )
    .limit(1);
  return row ? toFundingCall(row) : null;
}
