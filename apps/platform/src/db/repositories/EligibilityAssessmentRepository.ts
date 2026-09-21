import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import { eligibilityAssessments } from "@/db/schema";
import type {
  EligibilityAnswer,
  EligibilityOutcome,
  EligibilityRuleSnapshot,
} from "@/modules/eligibility/EligibilityTypes";

const columns = {
  answers: eligibilityAssessments.answers,
  createdAt: eligibilityAssessments.createdAt,
  fundingOpportunityId: eligibilityAssessments.fundingOpportunityId,
  fundingOpportunityTitle: eligibilityAssessments.fundingOpportunityTitle,
  id: eligibilityAssessments.id,
  outcome: eligibilityAssessments.outcome,
  ruleSetVersion: eligibilityAssessments.ruleSetVersion,
  ruleSnapshot: eligibilityAssessments.ruleSnapshot,
};

export function listOwnedEligibilityAssessments(
  ownerUserId: string,
  fundingOpportunityId: string,
) {
  return getDatabase()
    .select(columns)
    .from(eligibilityAssessments)
    .where(and(
      eq(eligibilityAssessments.userId, ownerUserId),
      eq(eligibilityAssessments.fundingOpportunityId, fundingOpportunityId),
    ))
    .orderBy(
      desc(eligibilityAssessments.createdAt),
      desc(eligibilityAssessments.id),
    )
    .limit(20);
}

export async function createOwnedEligibilityAssessment(input: {
  answers: Record<string, EligibilityAnswer>;
  fundingOpportunityId: string;
  fundingOpportunityTitle: string;
  outcome: EligibilityOutcome;
  ownerUserId: string;
  ruleSetVersion: string;
  rules: EligibilityRuleSnapshot[];
}) {
  const [assessment] = await getDatabase()
    .insert(eligibilityAssessments)
    .values({
      answers: input.answers,
      fundingOpportunityId: input.fundingOpportunityId,
      fundingOpportunityTitle: input.fundingOpportunityTitle,
      outcome: input.outcome,
      ruleSetVersion: input.ruleSetVersion,
      ruleSnapshot: input.rules,
      userId: input.ownerUserId,
    })
    .returning(columns);

  return assessment;
}
