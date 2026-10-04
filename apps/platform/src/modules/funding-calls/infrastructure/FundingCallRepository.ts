import "server-only";

import {
  and,
  count,
  desc,
  eq,
  inArray,
  lt,
  or,
} from "drizzle-orm";

import { getDatabase } from "@/db/client";
import type {
  FundingCallCreateInput,
  FundingCallUpdateInput,
} from "../api/FundingCallSchemas";
import type { FundingCall } from "../domain/FundingCall";
import { assertFundingCallAttachmentsUnchanged } from "../domain/FundingCallAttachmentPolicy";
import { publicFundingCallConditions } from "./PublicFundingCallRepository";
import {
  sanitizeFundingCallDescription,
  sanitizeFundingCallEligibilitySummary,
} from "./FundingCallRichText";
import { fundingCalls } from "./funding-call.schema";
import { fundingCallCreationProgress } from "./funding-call-creation-progress.schema";

function toFundingCall(row: typeof fundingCalls.$inferSelect): FundingCall {
  return {
    ...row,
    description: sanitizeFundingCallDescription(row.description),
    eligibilitySummary: sanitizeFundingCallEligibilitySummary(
      row.eligibilitySummary,
    ),
  };
}

export async function insertFundingCall(
  actorId: string,
  input: FundingCallCreateInput,
): Promise<FundingCall> {
  return getDatabase().transaction(async (transaction) => {
    const [created] = await transaction
      .insert(fundingCalls)
      .values({
        ...input,
        closesAt: new Date(input.closesAt),
        createdBy: actorId,
        description: sanitizeFundingCallDescription(input.description),
        eligibilitySummary: sanitizeFundingCallEligibilitySummary(
          input.eligibilitySummary,
        ),
        opensAt: new Date(input.opensAt),
        status: "DRAFT",
        updatedBy: actorId,
      })
      .returning();

    await transaction
      .delete(fundingCallCreationProgress)
      .where(eq(fundingCallCreationProgress.ownerId, actorId));

    return toFundingCall(created);
  });
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
  return getDatabase().transaction(async (transaction) => {
    // Application creation locks the same call row before recording its binding.
    const [current] = await transaction
      .select({
        attachmentsLockedAt: fundingCalls.attachmentsLockedAt,
        eligibilityRuleSetVersionId: fundingCalls.eligibilityRuleSetVersionId,
        formVersionId: fundingCalls.formVersionId,
        rowVersion: fundingCalls.rowVersion,
        status: fundingCalls.status,
        workflowTemplateVersionId: fundingCalls.workflowTemplateVersionId,
      })
      .from(fundingCalls)
      .where(eq(fundingCalls.id, id))
      .for("update")
      .limit(1);
    if (
      !current
      || current.status !== "DRAFT"
      || current.rowVersion !== expectedRowVersion
    ) return null;
    assertFundingCallAttachmentsUnchanged(current, input);
    const [updated] = await transaction
      .update(fundingCalls)
      .set({
        ...values,
        closesAt: new Date(values.closesAt),
        description: sanitizeFundingCallDescription(values.description),
        eligibilitySummary: sanitizeFundingCallEligibilitySummary(
          values.eligibilitySummary,
        ),
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
  });
}

type PublishedFundingCallQuery = {
  after?: { id: string; opensAt: Date };
  limit: number;
  now: Date;
  search?: string;
  status?: "closed" | "open" | "upcoming";
};

function publishedConditions(input: PublishedFundingCallQuery) {
  return publicFundingCallConditions(input);
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
        inArray(fundingCalls.status, ["SCHEDULED", "LIVE", "CLOSED"]),
      ),
    )
    .limit(1);
  return row ? toFundingCall(row) : null;
}
