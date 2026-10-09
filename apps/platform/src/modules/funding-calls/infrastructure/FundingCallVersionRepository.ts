import "server-only";

import { and, count, desc, eq, sql } from "drizzle-orm";
import { getDatabase, type DatabaseTransaction } from "@/db/client";
import { authorizationAuditEntries } from "@/db/schema";
import { copyCallIntegrationBindings } from "@/modules/eligibility/infrastructure/EligibilityIntegrationVersionBindingRepository";
import type { FundingCall } from "../domain/FundingCall";
import { captureFundingCallPublication } from "../domain/FundingCallPublication";
import {
  canPrepareFundingCallReplacement,
  fundingCallWorkingView,
} from "../domain/FundingCallVersion";
import { fundingCallDraftVersions } from "./funding-call-version.schema";
import {
  fundingCallPublicationRevisions,
  fundingCalls,
} from "./funding-call.schema";

export async function readWorkingFundingCall(
  transaction: DatabaseTransaction,
  call: FundingCall,
) {
  const [draft] = await transaction
    .select()
    .from(fundingCallDraftVersions)
    .where(eq(fundingCallDraftVersions.fundingCallId, call.id))
    .limit(1);
  return {
    call: fundingCallWorkingView(call, draft ?? null),
    draft: draft ?? null,
  };
}

export async function createFundingCallReplacement(
  actorId: string,
  id: string,
  expectedRowVersion: number,
) {
  return getDatabase().transaction(async (transaction) => {
    const [effective] = await transaction
      .select()
      .from(fundingCalls)
      .where(eq(fundingCalls.id, id))
      .for("update")
      .limit(1);
    if (!effective || effective.rowVersion !== expectedRowVersion) return null;
    const { call, draft } = await readWorkingFundingCall(
      transaction,
      effective,
    );
    if (draft) return call;
    if (!canPrepareFundingCallReplacement(effective)) return null;
    const [created] = await transaction
      .insert(fundingCallDraftVersions)
      .values({
        fundingCallId: id,
        snapshot: captureFundingCallPublication(effective, []),
        createdBy: actorId,
        updatedBy: actorId,
      })
      .returning();
    await copyCallIntegrationBindings(
      transaction,
      id,
      effective.currentPublishedVersionId!,
      created.id,
      actorId,
    );
    const [updated] = await transaction
      .update(fundingCalls)
      .set({
        rowVersion: effective.rowVersion + 1,
      })
      .where(eq(fundingCalls.id, id))
      .returning();
    await transaction.insert(authorizationAuditEntries).values({
      action: "funding_call.version.draft_created",
      actorId,
      changes: {
        fundingCallId: id,
        versionId: created.id,
        sourceVersionId: effective.currentPublishedVersionId,
      },
    });
    return fundingCallWorkingView(updated, created);
  });
}

export async function updateWorkingFundingCall(
  transaction: DatabaseTransaction,
  effective: typeof fundingCalls.$inferSelect,
  draft: typeof fundingCallDraftVersions.$inferSelect,
  call: FundingCall,
) {
  const [updatedDraft] = await transaction
    .update(fundingCallDraftVersions)
    .set({
      snapshot: captureFundingCallPublication(
        call,
        draft.snapshot.publicDocuments,
      ),
      status: call.status as typeof draft.status,
      updatedAt: call.updatedAt,
      updatedBy: call.updatedBy,
    })
    .where(eq(fundingCallDraftVersions.id, draft.id))
    .returning();
  const [updated] = await transaction
    .update(fundingCalls)
    .set({
      rowVersion: effective.rowVersion + 1,
    })
    .where(
      and(
        eq(fundingCalls.id, effective.id),
        eq(fundingCalls.rowVersion, effective.rowVersion),
      ),
    )
    .returning();
  if (!updated)
    throw new Error("Locked funding call changed during version update.");
  return fundingCallWorkingView(updated, updatedDraft);
}

export async function listFundingCallVersions(id: string, page: number) {
  const database = getDatabase();
  const [items, totals] = await Promise.all([
    database
      .select({
        id: fundingCallPublicationRevisions.id,
        versionNumber: fundingCallPublicationRevisions.revisionNumber,
        publishedAt: fundingCallPublicationRevisions.publishedAt,
        title: sql<string>`${fundingCallPublicationRevisions.snapshot}->>'title'`,
        current: sql<boolean>`${fundingCallPublicationRevisions.id} = ${fundingCalls.currentPublishedVersionId}`,
      })
      .from(fundingCallPublicationRevisions)
      .innerJoin(
        fundingCalls,
        eq(fundingCalls.id, fundingCallPublicationRevisions.fundingCallId),
      )
      .where(eq(fundingCalls.id, id))
      .orderBy(desc(fundingCallPublicationRevisions.revisionNumber))
      .limit(10)
      .offset((page - 1) * 10),
    database
      .select({ total: count() })
      .from(fundingCallPublicationRevisions)
      .where(eq(fundingCallPublicationRevisions.fundingCallId, id)),
  ]);
  return { items, page, pageSize: 10, total: totals[0]?.total ?? 0 };
}

export async function readHistoricalFundingCall(
  id: string,
  versionId: string,
): Promise<FundingCall | null> {
  const [row] = await getDatabase()
    .select({
      call: fundingCalls,
      snapshot: fundingCallPublicationRevisions.snapshot,
      publishedAt: fundingCallPublicationRevisions.publishedAt,
      publishedStatus: fundingCallPublicationRevisions.publishedStatus,
    })
    .from(fundingCallPublicationRevisions)
    .innerJoin(
      fundingCalls,
      eq(fundingCalls.id, fundingCallPublicationRevisions.fundingCallId),
    )
    .where(
      and(
        eq(fundingCalls.id, id),
        eq(fundingCallPublicationRevisions.id, versionId),
      ),
    )
    .limit(1);
  if (!row) return null;
  return {
    ...row.call,
    ...row.snapshot,
    opensAt: new Date(row.snapshot.opensAt),
    closesAt: new Date(row.snapshot.closesAt),
    viewedPublishedVersionId: versionId,
    status: row.publishedStatus,
    updatedAt: row.publishedAt,
  };
}
