import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { fundingCalls } from "./funding-call.schema";

export function readEligibilityRuleSetContexts(versionId: string) {
  return getDatabase()
    .select({
      formVersionId: fundingCalls.formVersionId,
      id: fundingCalls.id,
      title: fundingCalls.title,
      workflowTemplateVersionId: fundingCalls.workflowTemplateVersionId,
    })
    .from(fundingCalls)
    .where(and(
      eq(fundingCalls.eligibilityRuleSetVersionId, versionId),
      eq(fundingCalls.status, "DRAFT"),
    ))
    .orderBy(asc(fundingCalls.title), asc(fundingCalls.id));
}
