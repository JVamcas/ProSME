import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";
import { unionAll } from "drizzle-orm/pg-core";
import { getDatabase } from "@/db/client";
import { fundingCalls } from "./funding-call.schema";
import { fundingCallDraftVersions } from "./funding-call-version.schema";

export function readEligibilityRuleSetContexts(versionId: string) {
  const database = getDatabase();
  return unionAll(
    database
      .select({
        formVersionId: fundingCalls.formVersionId,
        currentPublishedVersionId: fundingCalls.currentPublishedVersionId,
        draftVersionId: sql<string | null>`null::uuid`,
        id: fundingCalls.id,
        title: fundingCalls.title,
        workflowTemplateVersionId: fundingCalls.workflowTemplateVersionId,
      })
      .from(fundingCalls)
      .where(
        and(
          eq(fundingCalls.eligibilityRuleSetVersionId, versionId),
          eq(fundingCalls.status, "DRAFT"),
        ),
      ),
    database
      .select({
        formVersionId: sql<
          string | null
        >`(${fundingCallDraftVersions.snapshot}->>'formVersionId')::uuid`,
        currentPublishedVersionId: sql<string | null>`null::uuid`,
        draftVersionId: fundingCallDraftVersions.id,
        id: fundingCallDraftVersions.fundingCallId,
        title: sql<string>`${fundingCallDraftVersions.snapshot}->>'title'`,
        workflowTemplateVersionId: sql<
          string | null
        >`(${fundingCallDraftVersions.snapshot}->>'workflowTemplateVersionId')::uuid`,
      })
      .from(fundingCallDraftVersions)
      .where(
        and(
          eq(fundingCallDraftVersions.status, "DRAFT"),
          sql`${fundingCallDraftVersions.snapshot}->>'eligibilityRuleSetVersionId' = ${versionId}`,
        ),
      ),
  ).orderBy(asc(sql`title`), asc(sql`id`));
}
