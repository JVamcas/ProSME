import "server-only";

import { permissionCodes } from "@/auth/authorization/permissions";
import {
  can,
  requireAuthenticatedUser,
  requireAnyPermission,
  requirePermission,
} from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import type { JsonValue } from "@/modules/conditions/domain/Operand";
import {
  IdempotencyConflictError,
  ResourceConflictError,
  ResourceNotFoundError,
} from "@/lib/resource-errors";
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
import { validateTaskConfiguration } from "@/modules/workflows/WorkflowTaskRegistry";
import {
  findAuthoritativeEligibilityExecutionByCommand,
  lockAuthoritativeEligibilityTask,
  persistAuthoritativeEligibilityExecution,
  withAuthoritativeEligibilityExecutionTransaction,
} from "../infrastructure/AuthoritativeEligibilityExecutionRepository";

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
  evaluationNumber: number;
  fundingCall: FundingCallEvaluationSource;
  workflowTaskId: string;
};

export class AuthoritativeEligibilityUnavailableError extends ResourceConflictError {
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

export type ExecuteAuthoritativeEligibilityInput = {
  correlationId: string;
  expectedRowVersion: number;
  idempotencyKey: string;
  taskId: string;
};

function executionResult(
  outcome: AuthoritativeEligibilityOutcomeWrite & { id: string },
  rowVersion: number,
) {
  return {
    eligible: outcome.eligible,
    evaluationId: outcome.id,
    evaluationNumber: outcome.evaluationNumber,
    hardFailureCount: outcome.hardFailures.length,
    manualScreeningRequired: outcome.manualScreeningRequired,
    outcome: outcome.finalOutcome,
    rowVersion,
    softFailureCount: outcome.softFailures.length,
    warningCount: outcome.warnings.length,
  };
}

function evidenceFingerprint(
  outcome: Pick<
    AuthoritativeEligibilityOutcomeWrite,
    "evaluatedValueProvenance" | "evaluatedValues"
  >,
) {
  const provenance = Object.fromEntries(
    Object.entries(outcome.evaluatedValueProvenance).map(([path, value]) => [
      path,
      {
        inputDefinitionId: value.inputDefinitionId,
        sourceDefinitionId: value.sourceDefinitionId,
        sourceKey: value.sourceKey,
        sourceKind: value.sourceKind,
        sourceRecordId: value.sourceRecordId,
        sourceVersionId: value.sourceVersionId,
      },
    ]),
  );
  return JSON.stringify({ provenance, values: outcome.evaluatedValues });
}

export async function executeAuthoritativeEligibility(
  user: AuthenticatedUser | null,
  input: ExecuteAuthoritativeEligibilityInput,
) {
  const actor = requireAuthenticatedUser(user);
  return withAuthoritativeEligibilityExecutionTransaction(
    async (transaction) => {
      const target = await lockAuthoritativeEligibilityTask(
        transaction,
        input.taskId,
        actor.id,
      );
      if (!target) throw new ResourceNotFoundError("eligibility workflow task");
      requirePermission(actor, target.permissions.edit);
      if (!target.assignedToActor) {
        throw new ResourceNotFoundError("eligibility workflow task");
      }
      const replay = await findAuthoritativeEligibilityExecutionByCommand(
        transaction,
        input.idempotencyKey,
      );
      if (replay) {
        if (
          replay.workflowTaskId !== target.taskId
          || replay.evaluatedBy !== actor.id
        ) {
          throw new IdempotencyConflictError(
            "That idempotency key was already used for another evaluation.",
          );
        }
        return executionResult(replay, target.rowVersion);
      }
      if (target.rowVersion !== input.expectedRowVersion) {
        throw new ResourceConflictError(
          "This eligibility task changed. Refresh and try again.",
        );
      }
      const canReevaluateCompletedTask = target.status === "COMPLETED"
        && target.previousOutcome !== null;
      if (!canReevaluateCompletedTask
        && !["CLAIMED", "IN_PROGRESS"].includes(target.status)) {
        throw new ResourceConflictError(
          "The eligibility task is not ready to run.",
        );
      }
      if (
        target.taskKey !== "AUTHORITATIVE_ELIGIBILITY"
        || target.taskType !== "AUTOMATED_RULE_CHECK"
      ) {
        throw new ResourceConflictError(
          "This task does not run authoritative eligibility.",
        );
      }
      if (target.prerequisiteNames.length) {
        throw new ResourceConflictError(
          `Complete these Screening prerequisites first: ${target.prerequisiteNames.join(", ")}.`,
        );
      }
      const parsedConfig = validateTaskConfiguration(
        "AUTOMATED_RULE_CHECK",
        target.config,
      );
      if (!parsedConfig.success) {
        throw new ResourceConflictError(
          "The authoritative eligibility task configuration is invalid.",
        );
      }
      const config = parsedConfig.data as {
        command: "AUTHORITATIVE_ELIGIBILITY";
        reevaluationPolicy: "NEVER" | "WHEN_EVIDENCE_CHANGED";
      };
      if (target.previousOutcome && config.reevaluationPolicy === "NEVER") {
        throw new ResourceConflictError(
          "This workflow does not permit eligibility re-evaluation.",
        );
      }
      const outcome = await prepareAuthoritativeEligibilityOutcome(
        transaction,
        {
          actorId: actor.id,
          application: target.application,
          business: target.business,
          correlationId: input.correlationId,
          evaluatedAt: new Date(),
          evaluationNumber: (target.previousOutcome?.evaluationNumber ?? 0) + 1,
          fundingCall: target.fundingCall,
          workflowTaskId: target.taskId,
        },
      );
      if (target.previousOutcome) {
        if (
          evidenceFingerprint(outcome)
          === evidenceFingerprint(target.previousOutcome)
        ) {
          throw new ResourceConflictError(
            "Eligibility evidence has not changed since the last evaluation.",
          );
        }
      }
      return persistAuthoritativeEligibilityExecution(transaction, {
        commandKey: input.idempotencyKey,
        correlationId: input.correlationId,
        expectedRowVersion: input.expectedRowVersion,
        outcome,
        stageInstanceId: target.stageInstanceId,
        taskId: target.taskId,
        workflowInstanceId: target.workflowInstanceId,
      });
    },
  );
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
    evaluationNumber: input.evaluationNumber,
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
    workflowTaskId: input.workflowTaskId,
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
