import "server-only";

import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  applicationSubmissionCommands,
  workflowAuditEntries,
  workflowInstances,
} from "@/db/schema";
import { AuthoritativeEligibilityUnavailableError } from "@/modules/eligibility/application/ServerAuthoritativeEligibilityService";
import {
  ApplicationReferenceConfigurationError,
} from "../domain/ApplicationReference";
import { readApplicationPreflightToken } from "../domain/ApplicationPreflightToken";
import {
  InitialStageActivationError,
  writeApplicationSubmission,
} from "./ApplicationSubmissionWriter";
import { validateApplicationSubmissionState } from "./ApplicationSubmissionValidation";

export type SubmissionTransaction = Parameters<
  Parameters<ReturnType<typeof getDatabase>["transaction"]>[0]
>[0];

export type SubmissionResult = {
  applicationId: string;
  reference: string;
  submittedAt: string;
  workflowInstanceId: string;
  workflowTemplateVersionId: string;
};

export type SubmitApplicationResult =
  | { kind: "submitted"; result: SubmissionResult }
  | {
      kind:
        | "documents_invalid"
        | "draft_incomplete"
        | "duplicate_submission"
        | "eligibility_unavailable"
        | "idempotency_conflict"
        | "not_found"
        | "opportunity_unavailable"
        | "reference_configuration_invalid"
        | "representative_authority_required"
        | "stage_entry_condition_failed"
        | "stale_preflight"
        | "workflow_unavailable";
    };

export type SubmitApplicationInput = {
  actorId: string;
  applicationId: string;
  correlationId: string;
  expectedApplicationRowVersion: number;
  finalConfirmation: true;
  idempotencyKey: string;
  readinessToken: string;
};

function commandFingerprint(input: SubmitApplicationInput) {
  return createHash("sha256").update(JSON.stringify({
    applicationId: input.applicationId,
    expectedApplicationRowVersion: input.expectedApplicationRowVersion,
    finalConfirmation: input.finalConfirmation,
    readinessToken: input.readinessToken,
  })).digest("hex");
}

function submissionView(record: {
  applicationId: string;
  reference: string;
  submittedAt: Date;
  workflowInstanceId: string;
  workflowTemplateVersionId: string;
}): SubmissionResult {
  return { ...record, submittedAt: record.submittedAt.toISOString() };
}

async function findKeyReplay(
  transaction: SubmissionTransaction,
  input: SubmitApplicationInput,
  requestFingerprint: string,
): Promise<SubmitApplicationResult | null> {
  const [audit, command] = await Promise.all([
    transaction
      .select({ action: workflowAuditEntries.action })
      .from(workflowAuditEntries)
      .where(eq(workflowAuditEntries.idempotencyKey, input.idempotencyKey))
      .limit(1),
    transaction
      .select()
      .from(applicationSubmissionCommands)
      .where(eq(
        applicationSubmissionCommands.idempotencyKey,
        input.idempotencyKey,
      ))
      .limit(1),
  ]);
  const existing = command[0];
  if (audit[0] && !existing) return { kind: "idempotency_conflict" };
  if (!existing) return null;
  if (
    existing.applicationId !== input.applicationId
    || existing.requestFingerprint !== requestFingerprint
  ) {
    return { kind: "idempotency_conflict" };
  }
  const [instance] = await transaction
    .select({
      workflowTemplateVersionId: workflowInstances.workflowTemplateVersionId,
    })
    .from(workflowInstances)
    .where(eq(workflowInstances.id, existing.workflowInstanceId))
    .limit(1);
  if (!instance) return { kind: "idempotency_conflict" };
  return {
    kind: "submitted",
    result: submissionView({ ...existing, ...instance }),
  };
}

async function findExistingSubmission(
  transaction: SubmissionTransaction,
  applicationId: string,
) {
  const [existing] = await transaction
    .select({
      applicationId: applicationSubmissionCommands.applicationId,
      reference: applicationSubmissionCommands.reference,
      submittedAt: applicationSubmissionCommands.submittedAt,
      workflowInstanceId: applicationSubmissionCommands.workflowInstanceId,
      workflowTemplateVersionId: workflowInstances.workflowTemplateVersionId,
    })
    .from(applicationSubmissionCommands)
    .innerJoin(
      workflowInstances,
      eq(
        workflowInstances.id,
        applicationSubmissionCommands.workflowInstanceId,
      ),
    )
    .where(eq(applicationSubmissionCommands.applicationId, applicationId))
    .limit(1);
  return existing ? submissionView(existing) : null;
}

function blockerResult(codes: Set<string>): SubmitApplicationResult {
  if (codes.has("REPRESENTATIVE_AUTHORITY_REQUIRED")) {
    return { kind: "representative_authority_required" };
  }
  if (codes.has("DUPLICATE_SUBMISSION")) {
    return { kind: "duplicate_submission" };
  }
  if ([...codes].some((code) => code.startsWith("DOCUMENT_"))) {
    return { kind: "documents_invalid" };
  }
  if (codes.has("SUBMISSION_WINDOW_CLOSED")) {
    return { kind: "opportunity_unavailable" };
  }
  if (codes.has("ELIGIBILITY_SERVICE_UNAVAILABLE")) {
    return { kind: "eligibility_unavailable" };
  }
  if (codes.has("INITIAL_WORKFLOW_STAGE_UNAVAILABLE")) {
    return { kind: "workflow_unavailable" };
  }
  return { kind: "draft_incomplete" };
}

function tokenMatchesState(
  input: SubmitApplicationInput,
  state: NonNullable<Awaited<ReturnType<typeof validateApplicationSubmissionState>>>,
  now: Date,
) {
  const token = readApplicationPreflightToken(input.readinessToken, now);
  return Boolean(
    token
    && token.applicationId === state.application.id
    && token.ownerUserId === state.application.ownerUserId
    && token.applicationRowVersion === state.application.rowVersion
    && token.applicationRowVersion === input.expectedApplicationRowVersion
    && token.responseRowVersion === state.context?.response.rowVersion
    && token.businessUpdatedAt === state.business?.updatedAt.toISOString()
    && token.configurationFingerprint === state.configurationFingerprint
    && token.documentFingerprint === state.documentFingerprint,
  );
}

async function submitInTransaction(
  transaction: SubmissionTransaction,
  input: SubmitApplicationInput,
): Promise<SubmitApplicationResult> {
  const requestFingerprint = commandFingerprint(input);
  const replay = await findKeyReplay(transaction, input, requestFingerprint);
  if (replay) return replay;
  const now = new Date();
  const state = await validateApplicationSubmissionState(transaction, {
    actorId: input.actorId,
    applicationId: input.applicationId,
    lockApplication: true,
    now,
  });
  if (!state) return { kind: "not_found" };
  const replayAfterLock = await findKeyReplay(
    transaction,
    input,
    requestFingerprint,
  );
  if (replayAfterLock) return replayAfterLock;
  const existing = await findExistingSubmission(transaction, input.applicationId);
  if (existing) return { kind: "submitted", result: existing };
  if (!tokenMatchesState(input, state, now)) {
    return { kind: "stale_preflight" };
  }
  if (!state.readiness?.ready) {
    return blockerResult(new Set(
      state.readiness?.blockers.map((blocker) => blocker.code) ?? [],
    ));
  }
  if (!state.business) return { kind: "representative_authority_required" };
  if (!state.configuration || !state.context) {
    return { kind: "workflow_unavailable" };
  }
  return writeApplicationSubmission(transaction, {
    actorId: input.actorId,
    application: state.application,
    business: state.business,
    configuration: state.configuration,
    context: state.context,
    correlationId: input.correlationId,
    idempotencyKey: input.idempotencyKey,
    requestFingerprint,
  });
}

export function submitOwnedApplication(
  input: SubmitApplicationInput,
): Promise<SubmitApplicationResult> {
  return getDatabase()
    .transaction((transaction) => submitInTransaction(transaction, input))
    .catch((error: unknown) => {
      if (error instanceof InitialStageActivationError) {
        if (error.resultKind === "entry_condition_failed") {
          return { kind: "stage_entry_condition_failed" as const };
        }
        return { kind: "workflow_unavailable" as const };
      }
      if (
        error instanceof AuthoritativeEligibilityUnavailableError
      ) {
        return { kind: "eligibility_unavailable" as const };
      }
      if (error instanceof ApplicationReferenceConfigurationError) {
        return { kind: "reference_configuration_invalid" as const };
      }
      throw error;
    });
}
