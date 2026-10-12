import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { FundingCallVersionItem } from "../api/FundingCallTransport";
import { getDatabase, type DatabaseTransaction } from "@/db/client";
import { authorizationAuditEntries } from "@/db/schema";
import { ResourceConflictError } from "@/lib/resource-errors";
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
  sourceVersionId?: string,
) {
  return getDatabase().transaction(async (transaction) => {
    const [effective] = await transaction
      .select()
      .from(fundingCalls)
      .where(eq(fundingCalls.id, id))
      .for("update")
      .limit(1);
    if (!effective || effective.rowVersion !== expectedRowVersion) return null;
    const sourceId = sourceVersionId ?? effective.currentPublishedVersionId;
    if (!sourceId) return null;
    const [source] = await transaction
      .select({ snapshot: fundingCallPublicationRevisions.snapshot })
      .from(fundingCallPublicationRevisions)
      .where(
        and(
          eq(fundingCallPublicationRevisions.id, sourceId),
          eq(fundingCallPublicationRevisions.fundingCallId, id),
        ),
      )
      .limit(1);
    if (!source) return null;
    const { call, draft } = await readWorkingFundingCall(
      transaction,
      effective,
    );
    if (draft) {
      if (draft.sourceVersionId !== sourceId) {
        throw new ResourceConflictError(
          "This call already has a replacement based on another published version. Complete that replacement before editing a different version.",
        );
      }
      return call;
    }
    if (!canPrepareFundingCallReplacement(effective)) return null;
    const [created] = await transaction
      .insert(fundingCallDraftVersions)
      .values({
        fundingCallId: id,
        sourceVersionId: sourceId,
        snapshot: source.snapshot,
        createdBy: actorId,
        updatedBy: actorId,
      })
      .returning();
    await copyCallIntegrationBindings(
      transaction,
      id,
      sourceId,
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
        sourceVersionId: sourceId,
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

function versionRows(id: string) {
  return sql`
    SELECT p.id, p.revision_number AS "versionNumber", p.published_at AS "publishedAt",
      p.snapshot->>'title' AS title,
      p.id = c.current_published_version_id AS current,
      CASE WHEN p.id = c.current_published_version_id THEN c.status ELSE 'SUPERSEDED' END AS status,
      'published' AS kind, NULL::integer AS "sourceVersionNumber", p.published_at AS "sortDate"
    FROM app_funding_call_publication_revisions p
    JOIN app_funding_calls c ON c.id = p.funding_call_id
    WHERE c.id = ${id}::uuid
    UNION ALL
    SELECT d.id, NULL::integer, NULL::timestamptz, d.snapshot->>'title', false,
      d.status, 'working', source.revision_number, d.updated_at
    FROM app_funding_call_draft_versions d
    LEFT JOIN app_funding_call_publication_revisions source
      ON source.id = d.source_version_id AND source.funding_call_id = d.funding_call_id
    WHERE d.funding_call_id = ${id}::uuid
    UNION ALL
    SELECT c.id, NULL::integer, NULL::timestamptz, c.title, false,
      c.status, 'working', NULL::integer, c.updated_at
    FROM app_funding_calls c
    WHERE c.id = ${id}::uuid AND c.current_published_version_id IS NULL
      AND NOT EXISTS (SELECT 1 FROM app_funding_call_draft_versions d WHERE d.funding_call_id = c.id)
  `;
}

export async function listFundingCallVersions(id: string, page: number) {
  const database = getDatabase();
  type Row = Omit<FundingCallVersionItem, "publishedAt"> & {
    publishedAt: Date | string | null;
  };
  const selection = versionRows(id);
  const [rows, totals] = await Promise.all([
    database.execute<Row>(sql`
      WITH versions AS (${selection})
      SELECT id, "versionNumber", "publishedAt", title, current, status, kind, "sourceVersionNumber"
      FROM versions ORDER BY (kind = 'working') DESC, "versionNumber" DESC NULLS FIRST, "sortDate" DESC, id
      LIMIT 10 OFFSET ${(page - 1) * 10}
    `),
    database.execute<{ total: number }>(sql`
      WITH versions AS (${selection}) SELECT count(*)::integer AS total FROM versions
    `),
  ]);
  return {
    items: rows.rows.map((row) => ({
      ...row,
      publishedAt: row.publishedAt
        ? new Date(row.publishedAt).toISOString()
        : null,
    })),
    page,
    pageSize: 10,
    total: totals.rows[0]?.total ?? 0,
  };
}

export async function readHistoricalFundingCall(
  id: string,
  versionId: string,
): Promise<FundingCall | null> {
  const currentPublication = alias(
    fundingCallPublicationRevisions,
    "current_publication",
  );
  const [row] = await getDatabase()
    .select({
      call: fundingCalls,
      viewedPublishedVersionNumber:
        fundingCallPublicationRevisions.revisionNumber,
      currentPublishedVersionNumber: currentPublication.revisionNumber,
      snapshot: fundingCallPublicationRevisions.snapshot,
      publishedAt: fundingCallPublicationRevisions.publishedAt,
      publishedStatus: fundingCallPublicationRevisions.publishedStatus,
    })
    .from(fundingCallPublicationRevisions)
    .innerJoin(
      fundingCalls,
      eq(fundingCalls.id, fundingCallPublicationRevisions.fundingCallId),
    )
    .leftJoin(
      currentPublication,
      and(
        eq(currentPublication.id, fundingCalls.currentPublishedVersionId),
        eq(currentPublication.fundingCallId, fundingCalls.id),
      ),
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
    viewedPublishedVersionNumber: row.viewedPublishedVersionNumber,
    currentPublishedVersionNumber: row.currentPublishedVersionNumber,
    status: row.publishedStatus,
    updatedAt: row.publishedAt,
  };
}
