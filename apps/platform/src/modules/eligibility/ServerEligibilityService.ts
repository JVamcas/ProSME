import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import { requirePermission } from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import {
  createOwnedEligibilityAssessment,
  listOwnedEligibilityAssessments,
} from "@/db/repositories/EligibilityAssessmentRepository";
import { ResourceConflictError, ResourceNotFoundError } from "@/lib/resource-errors";
import { findPublishedFundingOpportunity } from "@/modules/funding-calls/ServerFundingOpportunityIntegration";
import { loadPublishedEligibilityRuleSet } from "./ServerEligibilityIntegration";
import type {
  EligibilityAnswer,
  EligibilityAssessmentInput,
  EligibilityOutcome,
} from "./EligibilityTypes";

export class EligibilityUnavailableError extends ResourceNotFoundError {
  constructor() {
    super("eligibility assessment");
    this.name = "EligibilityUnavailableError";
  }
}

export class EligibilityRulesChangedError extends ResourceConflictError {
  constructor() {
    super("The eligibility questions changed. Review the latest questions and try again.");
    this.name = "EligibilityRulesChangedError";
  }
}

function assessmentView(
  assessment: Awaited<ReturnType<typeof createOwnedEligibilityAssessment>>,
) {
  return {
    answers: assessment.answers,
    createdAt: assessment.createdAt.toISOString(),
    fundingOpportunityId: assessment.fundingOpportunityId,
    fundingOpportunityTitle: assessment.fundingOpportunityTitle,
    id: assessment.id,
    outcome: assessment.outcome,
    rules: assessment.ruleSnapshot,
    ruleSetVersion: assessment.ruleSetVersion,
  };
}

function evaluate(
  answers: Record<string, EligibilityAnswer>,
  rules: Awaited<ReturnType<typeof loadPublishedEligibilityRuleSet>>["rules"],
): EligibilityOutcome {
  if (rules.some((rule) => rule.hardStop && answers[rule.id] === "no")) {
    return "not-currently-eligible";
  }
  if (rules.some((rule) => !rule.hardStop && answers[rule.id] === "no")) {
    return "action-required";
  }
  return "likely-eligible";
}

function validateAnswers(
  answers: Record<string, EligibilityAnswer>,
  ruleIds: string[],
) {
  const answerIds = Object.keys(answers).sort();
  const expectedIds = [...ruleIds].sort();
  if (JSON.stringify(answerIds) !== JSON.stringify(expectedIds)) {
    throw new EligibilityRulesChangedError();
  }
}

async function loadAvailableWorkspace(fundingOpportunityId: string) {
  const [opportunity, ruleSet] = await Promise.all([
    findPublishedFundingOpportunity(fundingOpportunityId),
    loadPublishedEligibilityRuleSet(),
  ]);
  if (!opportunity || opportunity.status !== "open" || !ruleSet.rules.length) {
    throw new EligibilityUnavailableError();
  }
  return { opportunity, ruleSet };
}

export async function getEligibilityWorkspace(
  user: AuthenticatedUser | null,
  fundingOpportunityId: string,
) {
  const actor = requirePermission(
    user,
    permissionCodes.fundingCallEligibilityOwnRead,
  );
  const [{ opportunity, ruleSet }, assessments] = await Promise.all([
    loadAvailableWorkspace(fundingOpportunityId),
    listOwnedEligibilityAssessments(actor.id, fundingOpportunityId),
  ]);
  return {
    assessments: assessments.map(assessmentView),
    fundingOpportunity: { id: opportunity.id, title: opportunity.title },
    rules: ruleSet.rules,
    ruleSetVersion: ruleSet.version,
  };
}

export async function createEligibilityAssessment(
  user: AuthenticatedUser | null,
  input: EligibilityAssessmentInput,
) {
  const actor = requirePermission(
    user,
    permissionCodes.fundingCallEligibilityCreate,
  );
  const { opportunity, ruleSet } = await loadAvailableWorkspace(
    input.fundingOpportunityId,
  );
  if (input.expectedRuleSetVersion !== ruleSet.version) {
    throw new EligibilityRulesChangedError();
  }
  validateAnswers(input.answers, ruleSet.rules.map((rule) => rule.id));
  const assessment = await createOwnedEligibilityAssessment({
    answers: input.answers,
    fundingOpportunityId: opportunity.id,
    fundingOpportunityTitle: opportunity.title,
    outcome: evaluate(input.answers, ruleSet.rules),
    ownerUserId: actor.id,
    rules: ruleSet.rules,
    ruleSetVersion: ruleSet.version,
  });
  return assessmentView(assessment);
}
