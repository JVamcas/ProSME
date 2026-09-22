import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import {
  can,
  requireAnyPermission,
} from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import type { WorkflowDataContext } from "@/modules/conditions/engine/WorkflowDataResolver";
import { ResourceNotFoundError } from "@/lib/resource-errors";
import type { FinalScreeningOutcome } from "../domain/AuthoritativeEligibilityOutcome";
import { evaluateEligibilityRuleSet } from "../engine/EligibilityEvaluator";
import {
  findAuthoritativeEligibilityOutcome,
  type AuthoritativeEligibilityTransaction,
  type AuthoritativeEligibilityOutcomeWrite,
} from "../infrastructure/AuthoritativeEligibilityRepository";
import { findRuntimeEligibilityRuleSetForEvaluation } from "../infrastructure/EligibilityEvaluationRepository";

type FundingCallEvaluationSource = {
  closesAt: Date;
  eligibilityRuleSetVersionId: string | null;
  fundingInstrument: string | null;
  id: string;
  maximumGrantAmount: string;
  minimumGrantAmount: string;
  opensAt: Date;
  slug: string;
  status: string;
  thematicArea: string | null;
  title: string;
  totalBudgetEnvelope: string;
};

type ApplicationEvaluationSource = {
  declarationsSection: { compliance?: boolean };
  eligibilityRuleSetVersionId: string | null;
  financialSection: { amountRequested?: number };
  id: string;
  rowVersion: number;
};

type BusinessEvaluationSource = {
  employeeCount: number | null;
  establishedYear: number | null;
  registrationNumber: string;
  updatedAt: Date;
};

type CreateAuthoritativeOutcomeInput = {
  actorId: string;
  application: ApplicationEvaluationSource;
  business: BusinessEvaluationSource;
  correlationId: string;
  evaluatedAt: Date;
  fundingCall: FundingCallEvaluationSource;
};

export class AuthoritativeEligibilityUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthoritativeEligibilityUnavailableError";
  }
}

function monthsInOperation(establishedYear: number | null, evaluatedAt: Date) {
  if (establishedYear === null) return null;
  return Math.max(0, (evaluatedAt.getUTCFullYear() - establishedYear) * 12);
}

function evaluationContext(
  application: ApplicationEvaluationSource,
  business: BusinessEvaluationSource,
  fundingCall: FundingCallEvaluationSource,
  evaluatedAt: Date,
): WorkflowDataContext {
  return {
    application: {
      annual_turnover: null,
      business: {
        bank_account_active: null,
        employee_count: business.employeeCount,
        operating_months: monthsInOperation(
          business.establishedYear,
          evaluatedAt,
        ),
        ownership_percentage: null,
        registered: business.registrationNumber.trim().length > 0,
        statutory_good_standing:
          application.declarationsSection.compliance ?? null,
      },
      requested_amount: application.financialSection.amountRequested ?? null,
    },
    eligibility: {},
    fundingCall: {
      closes_at: fundingCall.closesAt.toISOString(),
      funding_instrument: fundingCall.fundingInstrument,
      id: fundingCall.id,
      maximum_amount: Number(fundingCall.maximumGrantAmount),
      minimum_amount: Number(fundingCall.minimumGrantAmount),
      opens_at: fundingCall.opensAt.toISOString(),
      slug: fundingCall.slug,
      status: fundingCall.status,
      thematic_area: fundingCall.thematicArea,
      title: fundingCall.title,
      total_funding_amount: Number(fundingCall.totalBudgetEnvelope),
    },
    stages: [],
  };
}

function finalOutcome(
  eligible: boolean,
  manualScreeningRequired: boolean,
): FinalScreeningOutcome | null {
  if (!eligible) return "INELIGIBLE";
  return manualScreeningRequired ? null : "ELIGIBLE";
}

export async function prepareAuthoritativeEligibilityOutcome(
  transaction: AuthoritativeEligibilityTransaction,
  input: CreateAuthoritativeOutcomeInput,
) {
  const versionId = input.application.eligibilityRuleSetVersionId;
  if (!versionId || versionId !== input.fundingCall.eligibilityRuleSetVersionId) {
    throw new AuthoritativeEligibilityUnavailableError(
      "The application is not bound to the Funding Call eligibility version.",
    );
  }
  const ruleSet = await findRuntimeEligibilityRuleSetForEvaluation(
    versionId,
    transaction,
  );
  if (!ruleSet) {
    throw new AuthoritativeEligibilityUnavailableError(
      "The bound eligibility ruleset version is unavailable.",
    );
  }
  const result = evaluateEligibilityRuleSet(
    ruleSet,
    "SCREENING",
    evaluationContext(
      input.application,
      input.business,
      input.fundingCall,
      input.evaluatedAt,
    ),
  );
  return {
    applicationId: input.application.id,
    contextReference: {
      applicationId: input.application.id,
      applicationRowVersion: input.application.rowVersion,
      businessProfileUpdatedAt: input.business.updatedAt.toISOString(),
      correlationId: input.correlationId,
      fundingCallId: input.fundingCall.id,
    },
    eligible: result.eligible,
    evaluatedAt: input.evaluatedAt,
    evaluatedBy: input.actorId,
    evaluatedValues: result.evaluatedValues,
    finalOutcome: finalOutcome(
      result.eligible,
      result.manualScreeningRequired,
    ),
    hardFailures: result.hardFailures,
    manualScreeningRequired: result.manualScreeningRequired,
    ruleOutcomes: result.ruleOutcomes,
    ruleSetVersionId: result.ruleSetVersionId,
    ruleSetVersionNumber: result.ruleSetVersionNumber,
    softFailures: result.softFailures,
    warnings: result.warnings,
  } satisfies AuthoritativeEligibilityOutcomeWrite;
}

export async function getAuthoritativeEligibilityOutcome(
  user: AuthenticatedUser | null,
  applicationId: string,
) {
  const actor = requireAnyPermission(user, [
    permissionCodes.fundingApplicationOwnRead,
    permissionCodes.fundingApplicationAllRead,
  ]);
  const outcome = await findAuthoritativeEligibilityOutcome(
    applicationId,
    can(actor, permissionCodes.fundingApplicationAllRead)
      ? undefined
      : actor.id,
  );
  if (!outcome) {
    throw new ResourceNotFoundError("authoritative eligibility outcome");
  }
  return outcome;
}
