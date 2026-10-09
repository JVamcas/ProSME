import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  fundingCallPublicationRevisions,
  fundingCalls,
} from "@/modules/funding-calls/infrastructure/funding-call.schema";

export async function readApplicationFundingCallConfiguration(
  fundingCallId: string,
  versionId: string,
) {
  const [configuration] = await getDatabase()
    .select({
      status: fundingCalls.status,
      opensAt: fundingCalls.opensAt,
      closesAt: fundingCalls.closesAt,
      formVersionId: sql<
        string | null
      >`${fundingCallPublicationRevisions.snapshot}->>'formVersionId'`,
      eligibilityRuleSetVersionId: sql<
        string | null
      >`${fundingCallPublicationRevisions.snapshot}->>'eligibilityRuleSetVersionId'`,
      workflowTemplateVersionId: sql<
        string | null
      >`${fundingCallPublicationRevisions.snapshot}->>'workflowTemplateVersionId'`,
    })
    .from(fundingCalls)
    .innerJoin(
      fundingCallPublicationRevisions,
      and(
        eq(fundingCallPublicationRevisions.fundingCallId, fundingCalls.id),
        eq(fundingCallPublicationRevisions.id, versionId),
      ),
    )
    .where(eq(fundingCalls.id, fundingCallId))
    .limit(1);
  return configuration ?? null;
}
