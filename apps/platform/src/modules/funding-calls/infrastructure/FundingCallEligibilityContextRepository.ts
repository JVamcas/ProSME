import "server-only";

import { asc, eq } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { fundingCalls } from "./funding-call.schema";

export function readEligibilityRuleSetContexts(versionId: string) {
  return getDatabase()
    .select({
      formVersionId: fundingCalls.formVersionId,
      id: fundingCalls.id,
      title: fundingCalls.title,
    })
    .from(fundingCalls)
    .where(eq(fundingCalls.eligibilityRuleSetVersionId, versionId))
    .orderBy(asc(fundingCalls.title), asc(fundingCalls.id));
}
