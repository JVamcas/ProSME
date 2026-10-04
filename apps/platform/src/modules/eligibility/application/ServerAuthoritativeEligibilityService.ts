import "server-only";
import { evidenceFingerprint } from "../domain/EligibilityEvidenceFingerprint";
import { terminateWorkflowOnEligibilityFailure } from "@/modules/workflows/application/runtime/ServerWorkflowEligibilityFailureService";

import { permissionCodes } from "@/auth/authorization/permissions";
import {
  can,
  requireAuthenticatedUser,
  requireAnyPermission,
  requirePermission,
} from "@/auth/authorization/policy";
import type { AuthenticatedUser } from "@/auth/types";
import type {
  ApplicationEvaluationSource,
  BusinessEvaluationSource,
  CreateAuthoritativeOutcomeInput,
  FundingCallEvaluationSource,
} from "../domain/AuthoritativeEligibilityEvaluationSource";
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
import { saveEligibilityEvaluationForm } from "./SaveEligibilityEvaluationForm";
import { eligibilityExecutionResult } from "./EligibilityExecutionResult";
import { eligibilityCommandSchema } from "@/modules/workflows/WorkflowTaskRegistry";
import {
  findAuthoritativeEligibilityExecutionByCommand,
  lockAuthoritativeEligibilityTask,
  persistAuthoritativeEligibilityExecution,
  withAuthoritativeEligibilityExecutionTransaction,
} from "../infrastructure/AuthoritativeEligibilityExecutionRepository";

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
  confirmHardFailure?: boolean;
  correlationId: string;
  expectedRowVersion: number;
  expectedResponseRowVersion?: number;
  values?: Record<string, unknown>;
  idempotencyKey: string;
  taskId: string;
};

class EligibilityConfirmationRequired extends Error {}

export async function executeAuthoritativeEligibility(
  user: AuthenticatedUser | null,
  input: ExecuteAuthoritativeEligibilityInput,
) {
  const actor = requireAuthenticatedUser(user);
  return withAuthoritativeEligibilityExecutionTransaction(
    async (transaction) => {
      const replay = await findAuthoritativeEligibilityExecutionByCommand(
        transaction,
        input.idempotencyKey,
      );
      if (replay) {
        if (
          replay.workflowTaskId !== input.taskId ||
          replay.evaluatedBy !== actor.id
        ) {
          throw new IdempotencyConflictError(
            "That idempotency key was already used for another evaluation.",
          );
        }
        requirePermission(actor, replay.permissions.edit);
        if (replay.assignedUserId !== actor.id || !replay.coiCleared) {
          throw new ResourceNotFoundError("eligibility workflow task");
        }
        return eligibilityExecutionResult(replay, replay.taskRowVersion);
      }
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
      if (target.rowVersion !== input.expectedRowVersion) {
        throw new ResourceConflictError(
          "This eligibility task changed. Refresh and try again.",
        );
      }
      const canReevaluateCompletedTask =
        target.status === "COMPLETED" && target.previousOutcome !== null;
      if (
        !canReevaluateCompletedTask &&
        !["PENDING", "IN_PROGRESS"].includes(target.status)
      ) {
        throw new ResourceConflictError(
          "The eligibility task is not ready to run.",
        );
      }
      if (!eligibilityCommandSchema.safeParse(target.config).success) {
        throw new ResourceConflictError(
          "This task does not run authoritative eligibility.",
        );
      }
      if (target.prerequisiteNames.length) {
        throw new ResourceConflictError(
          `Complete these Screening prerequisites first: ${target.prerequisiteNames.join(", ")}.`,
        );
      }
      const parsedConfig = eligibilityCommandSchema.safeParse(target.config);
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
      let evaluatedFormValues: Record<string, unknown> | undefined;
      if (target.formVersionId) {
        if (!input.values) {
          throw new ResourceConflictError(
            "Eligibility answers are required to run the evaluation.",
          );
        }
        evaluatedFormValues = await saveEligibilityEvaluationForm(transaction, {
          actorId: actor.id,
          correlationId: input.correlationId,
          expectedResponseRowVersion: input.expectedResponseRowVersion,
          expectedTaskRowVersion: input.expectedRowVersion,
          formVersionId: target.formVersionId,
          taskId: target.taskId,
          values: input.values,
        });
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
          evidenceTaskId: target.formVersionId ? target.taskId : undefined,
          fundingCall: target.fundingCall,
          workflowTaskId: target.taskId,
        },
      );
      if (target.previousOutcome) {
        if (
          evidenceFingerprint(outcome) ===
          evidenceFingerprint(target.previousOutcome)
        ) {
          throw new ResourceConflictError(
            "Eligibility evidence has not changed since the last evaluation.",
          );
        }
      }
      if (outcome.hardFailures.length && !input.confirmHardFailure) {
        // Roll back the temporary answer save as well as any evaluation writes.
        // A cancelled warning must leave this task available for correction.
        throw new EligibilityConfirmationRequired();
      }
      const result = await persistAuthoritativeEligibilityExecution(
        transaction,
        {
          commandKey: input.idempotencyKey,
          correlationId: input.correlationId,
          expectedRowVersion: input.expectedRowVersion,
          outcome,
          evaluatedFormValues,
          stageInstanceId: target.stageInstanceId,
          taskId: target.taskId,
          workflowInstanceId: target.workflowInstanceId,
        },
      );
      const terminalStatus = await terminateWorkflowOnEligibilityFailure(
        transaction,
        {
          actorId: actor.id,
          config: target.config,
          correlationId: input.correlationId,
          evaluatedAt: outcome.evaluatedAt,
          evaluationId: result.evaluationId,
          hardFailures: outcome.hardFailures,
          stageInstanceId: target.stageInstanceId,
          taskId: target.taskId,
          workflowInstanceId: target.workflowInstanceId,
        },
      );
      if (!terminalStatus) return result;
      const receipt = await findAuthoritativeEligibilityExecutionByCommand(
        transaction,
        input.idempotencyKey,
      );
      if (!receipt)
        throw new ResourceConflictError(
          "The eligibility receipt is unavailable.",
        );
      return eligibilityExecutionResult(receipt, receipt.taskRowVersion);
    },
  ).catch((error: unknown) => {
    if (error instanceof EligibilityConfirmationRequired) {
      return { confirmationRequired: true as const };
    }
    throw error;
  });
}

function applicationSourceValues(
  application: ApplicationEvaluationSource,
  business: BusinessEvaluationSource,
): Record<string, JsonValue> {
  return {
    ...application.businessSection,
    ...application.declarationsSection,
    ...application.financialSection,
    ...application.projectSection,
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
  if (
    !versionId ||
    versionId !== input.fundingCall.eligibilityRuleSetVersionId
  ) {
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
      workflowTaskId: input.evidenceTaskId,
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
  const result = evaluateEligibilityRuleSet(ruleSet, "SCREENING", {
    application: applicationSourceValues(input.application, input.business),
    eligibility: resolved.values,
    fundingCall: fundingCallSourceValues(input.fundingCall),
    stages: [],
  });
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
    finalOutcome: finalOutcome(result.eligible, result.manualScreeningRequired),
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
