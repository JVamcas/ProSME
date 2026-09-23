import "server-only";

import { and, eq } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  applications,
  applicationSubmissionCommands,
  fundingCalls,
  workflowAuditEntries,
  workflowDefinitionVersions,
  workflowInstances,
  workflowStageDefinitions,
} from "@/db/schema";
import { isFundingCallEffectivelyOpen } from "@/modules/funding-calls/domain/FundingCallLifecycle";
import { readTransactionalApplicationReadiness } from "./ApplicationTransactionalReadiness";
import {
  InitialStageActivationError,
  writeApplicationSubmission,
} from "./ApplicationSubmissionWriter";

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
        | "business_required"
        | "eligibility_unavailable"
        | "idempotency_conflict"
        | "not_found"
        | "opportunity_unavailable"
        | "stage_entry_condition_failed"
        | "workflow_unavailable";
    };

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
  applicationId: string,
  idempotencyKey: string,
): Promise<SubmitApplicationResult | null> {
  const [audit] = await transaction
    .select({ action: workflowAuditEntries.action })
    .from(workflowAuditEntries)
    .where(eq(workflowAuditEntries.idempotencyKey, idempotencyKey))
    .limit(1);
  const [command] = await transaction
    .select()
    .from(applicationSubmissionCommands)
    .where(eq(applicationSubmissionCommands.idempotencyKey, idempotencyKey))
    .limit(1);
  if (audit && !command) return { kind: "idempotency_conflict" };
  if (command && command.applicationId !== applicationId) {
    return { kind: "idempotency_conflict" };
  }
  if (!command) return null;
  const [instance] = await transaction
    .select({
      workflowTemplateVersionId:
        workflowInstances.workflowTemplateVersionId,
    })
    .from(workflowInstances)
    .where(eq(workflowInstances.id, command.workflowInstanceId))
    .limit(1);
  return {
    kind: "submitted",
    result: submissionView({ ...command, ...instance! }),
  };
}

async function findExistingSubmission(
  transaction: SubmissionTransaction,
  applicationId: string,
): Promise<SubmissionResult | null> {
  const [existing] = await transaction
    .select()
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
  if (!existing) return null;
  return submissionView({
    ...existing.app_application_submission_commands,
    workflowTemplateVersionId:
      existing.app_workflow_instances.workflowTemplateVersionId,
  });
}

async function findInitialConfiguration(
  transaction: SubmissionTransaction,
  fundingOpportunityId: string,
) {
  const [configuration] = await transaction
    .select({
      closesAt: fundingCalls.closesAt,
      eligibilityRuleSetVersionId:
        fundingCalls.eligibilityRuleSetVersionId,
      fundingInstrument: fundingCalls.fundingInstrument,
      fundingCallId: fundingCalls.id,
      formVersionId: fundingCalls.formVersionId,
      maximumGrantAmount: fundingCalls.maximumGrantAmount,
      minimumGrantAmount: fundingCalls.minimumGrantAmount,
      opensAt: fundingCalls.opensAt,
      slug: fundingCalls.slug,
      stageId: workflowStageDefinitions.id,
      status: fundingCalls.status,
      thematicArea: fundingCalls.thematicArea,
      title: fundingCalls.title,
      totalBudgetEnvelope: fundingCalls.totalBudgetEnvelope,
      workflowTemplateVersionId: workflowDefinitionVersions.id,
    })
    .from(fundingCalls)
    .innerJoin(
      workflowDefinitionVersions,
      and(
        eq(
          workflowDefinitionVersions.id,
          fundingCalls.workflowTemplateVersionId,
        ),
        eq(workflowDefinitionVersions.status, "PUBLISHED"),
      ),
    )
    .innerJoin(
      workflowStageDefinitions,
      and(
        eq(workflowStageDefinitions.versionId, workflowDefinitionVersions.id),
        eq(workflowStageDefinitions.initial, true),
      ),
    )
    .where(eq(fundingCalls.id, fundingOpportunityId))
    .limit(1);
  return configuration ?? null;
}

async function submitInTransaction(
  transaction: SubmissionTransaction,
  input: SubmitApplicationInput,
): Promise<SubmitApplicationResult> {
  const replay = await findKeyReplay(
    transaction,
    input.applicationId,
    input.idempotencyKey,
  );
  if (replay) return replay;
  const [application] = await transaction
    .select()
    .from(applications)
    .where(
      and(
        eq(applications.id, input.applicationId),
        eq(applications.ownerUserId, input.actorId),
      ),
    )
    .for("update")
    .limit(1);
  if (!application) return { kind: "not_found" };
  const existing = await findExistingSubmission(transaction, application.id);
  if (existing) return { kind: "submitted", result: existing };
  if (!application.businessId) return { kind: "business_required" };
  const configuration = await findInitialConfiguration(
    transaction,
    application.fundingOpportunityId,
  );
  if (!configuration) return { kind: "workflow_unavailable" };
  const now = new Date();
  const callOpen = isFundingCallEffectivelyOpen(configuration, now);
  if (!application.formVersionId) return { kind: "draft_incomplete" };
  const eligibilityAvailable = Boolean(
    application.eligibilityRuleSetVersionId
    && application.eligibilityRuleSetVersionId
      === configuration.eligibilityRuleSetVersionId,
  );
  const readiness = await readTransactionalApplicationReadiness(
    transaction,
    { ...application, formVersionId: application.formVersionId },
    callOpen,
    Boolean(
      eligibilityAvailable
      && application.formVersionId === configuration.formVersionId,
    ),
    now,
  );
  if (!readiness) return { kind: "draft_incomplete" };
  if (readiness.blockers.some((blocker) => blocker.category === "document")) {
    return { kind: "documents_invalid" };
  }
  if (!callOpen) {
    return { kind: "opportunity_unavailable" };
  }
  if (!eligibilityAvailable) {
    return { kind: "eligibility_unavailable" };
  }
  if (!readiness.ready) return { kind: "draft_incomplete" };
  return writeApplicationSubmission(transaction, {
    ...input,
    application,
    configuration,
  });
}

type SubmitApplicationInput = {
  actorId: string;
  applicationId: string;
  correlationId: string;
  idempotencyKey: string;
};

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
      throw error;
    });
}
