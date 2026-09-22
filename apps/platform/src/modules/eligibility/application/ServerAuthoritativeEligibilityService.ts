import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import {
  can,
  requireAnyPermission,
} from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import type { JsonValue } from "@/modules/conditions/domain/Operand";
import { ResourceNotFoundError } from "@/lib/resource-errors";
import type { FinalScreeningOutcome } from "../domain/AuthoritativeEligibilityOutcome";
import { EligibilityInputResolutionError } from "../domain/EligibilityDataResolution";
import { evaluateEligibilityRuleSet } from "../engine/EligibilityEvaluator";
import {
  findAuthoritativeEligibilityOutcome,
  type AuthoritativeEligibilityTransaction,
  type AuthoritativeEligibilityOutcomeWrite,
} from "../infrastructure/AuthoritativeEligibilityRepository";
import { findRuntimeEligibilityRuleSetForEvaluation } from "../infrastructure/EligibilityEvaluationRepository";
import { resolveAuthoritativeEligibilityData } from "./ServerEligibilityDataResolver";

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
  businessSection?: Record<string, JsonValue>;
  declarationsSection: { compliance?: boolean };
  eligibilityRuleSetVersionId: string | null;
  financialSection: { amountRequested?: number };
  formVersionId?: string | null;
  id: string;
  projectSection?: Record<string, JsonValue>;
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
  readonly resolutionError: EligibilityInputResolutionError | null;

  constructor(
    message: string,
    resolutionError: EligibilityInputResolutionError | null = null,
  ) {
    super(message);
    this.name = "AuthoritativeEligibilityUnavailableError";
    this.resolutionError = resolutionError;
  }
}

function applicationSourceValues(
  application: ApplicationEvaluationSource,
  business: BusinessEvaluationSource,
): Record<string, JsonValue> {
  return {
    business: {
      employeeCount: business.employeeCount,
      establishedYear: business.establishedYear,
      registrationNumber: business.registrationNumber,
      updatedAt: business.updatedAt.toISOString(),
    },
    businessSection: application.businessSection ?? {},
    declarationsSection: application.declarationsSection,
    financialSection: application.financialSection,
    projectSection: application.projectSection ?? {},
  };
}

function fundingCallSourceValues(
  fundingCall: FundingCallEvaluationSource,
): Record<string, JsonValue> {
  return {
    closesAt: fundingCall.closesAt.toISOString(),
    fundingInstrument: fundingCall.fundingInstrument,
    id: fundingCall.id,
    maximumGrantAmount: Number(fundingCall.maximumGrantAmount),
    minimumGrantAmount: Number(fundingCall.minimumGrantAmount),
    opensAt: fundingCall.opensAt.toISOString(),
    slug: fundingCall.slug,
    status: fundingCall.status,
    thematicArea: fundingCall.thematicArea,
    title: fundingCall.title,
    totalBudgetEnvelope: Number(fundingCall.totalBudgetEnvelope),
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
  let resolved;
  try {
    resolved = await resolveAuthoritativeEligibilityData({
      applicationId: input.application.id,
      applicationSourceVersionId: input.application.formVersionId ?? null,
      applicationValues: applicationSourceValues(
        input.application,
        input.business,
      ),
      database: transaction,
      evaluatedAt: input.evaluatedAt,
      fundingCallId: input.fundingCall.id,
      fundingCallValues: fundingCallSourceValues(input.fundingCall),
      ruleSet,
    });
  } catch (error) {
    if (error instanceof EligibilityInputResolutionError) {
      throw new AuthoritativeEligibilityUnavailableError(
        "The configured Screening evidence is incomplete or unavailable.",
        error,
      );
    }
    throw error;
  }
  const result = evaluateEligibilityRuleSet(
    ruleSet,
    "SCREENING",
    {
      application: {},
      eligibility: resolved.values,
      fundingCall: {},
      stages: [],
    },
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
    evaluatedValueProvenance: resolved.provenance,
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
