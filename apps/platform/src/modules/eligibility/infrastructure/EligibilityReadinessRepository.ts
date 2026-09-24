import "server-only";

import { eq } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  eligibilityRuleSets,
  eligibilityRuleSetVersions,
} from "./eligibility-ruleset.schema";

export async function readEligibilityReadinessVersion(versionId: string) {
  const [version] = await getDatabase()
    .select({
      active: eligibilityRuleSets.active,
      status: eligibilityRuleSetVersions.status,
      versionId: eligibilityRuleSetVersions.id,
    })
    .from(eligibilityRuleSetVersions)
    .innerJoin(
      eligibilityRuleSets,
      eq(eligibilityRuleSets.id, eligibilityRuleSetVersions.ruleSetId),
    )
    .where(eq(eligibilityRuleSetVersions.id, versionId))
    .limit(1);
  return version ?? null;
}
