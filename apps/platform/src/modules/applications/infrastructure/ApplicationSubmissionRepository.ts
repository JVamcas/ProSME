import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  applicationDocuments,
  applications,
  applicationSubmissionCommands,
  businessProfiles,
  fundingCalls,
  workflowAuditEntries,
  workflowDefinitionVersions,
  workflowInstances,
  workflowStageDefinitions,
} from "@/db/schema";
import type { ApplicationDocumentType } from "@/modules/applications/ApplicationDocumentSchemas";
import {
  AuthoritativeEligibilityUnavailableError,
  prepareAuthoritativeEligibilityOutcome,
} from "@/modules/eligibility/application/ServerAuthoritativeEligibilityService";
import { isFundingCallEffectivelyOpen } from "@/modules/funding-calls/domain/FundingCallLifecycle";
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

async function requiredDocumentsAreClean(
  transaction: SubmissionTransaction,
  applicationId: string,
  ownerUserId: string,
  requiredTypes: ApplicationDocumentType[],
) {
  const documents = await transaction
    .select({
      documentType: applicationDocuments.documentType,
      scanStatus: applicationDocuments.scanStatus,
    })
    .from(applicationDocuments)
    .where(
      and(
        eq(applicationDocuments.applicationId, applicationId),
        eq(applicationDocuments.ownerUserId, ownerUserId),
        inArray(applicationDocuments.documentType, requiredTypes),
      ),
    );
  const cleanTypes = new Set(
    documents
      // .filter((document) => document.scanStatus === "clean")
      .map((document) => document.documentType),
  );
  return requiredTypes.every((type) => cleanTypes.has(type));
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

async function findBusinessForEvaluation(
  transaction: SubmissionTransaction,
  businessId: string,
) {
  const [business] = await transaction
    .select()
    .from(businessProfiles)
    .where(eq(businessProfiles.id, businessId))
    .limit(1);
  return business ?? null;
}

function draftIsComplete(application: {
  declarationAcceptance: unknown;
  sectionCompletion: Record<string, boolean>;
}) {
  return (
    application.declarationAcceptance !== null &&
    Object.values(application.sectionCompletion).every(Boolean)
  );
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
  if (!draftIsComplete(application)) return { kind: "draft_incomplete" };
  const documentsValid = await requiredDocumentsAreClean(
    transaction,
    application.id,
    input.actorId,
    input.requiredDocumentTypes,
  );
  if (!documentsValid) return { kind: "documents_invalid" };
  const configuration = await findInitialConfiguration(
    transaction,
    application.fundingOpportunityId,
  );
  if (!configuration) return { kind: "workflow_unavailable" };
  if (!isFundingCallEffectivelyOpen(configuration, new Date())) {
    return { kind: "opportunity_unavailable" };
  }
  const business = await findBusinessForEvaluation(
    transaction,
    application.businessId,
  );
  if (!business) return { kind: "business_required" };
  try {
    const eligibilityOutcome = await prepareAuthoritativeEligibilityOutcome(
      transaction,
      {
        actorId: input.actorId,
        application,
        business,
        correlationId: input.correlationId,
        evaluatedAt: new Date(),
        fundingCall: {
          closesAt: configuration.closesAt,
          eligibilityRuleSetVersionId:
            configuration.eligibilityRuleSetVersionId,
          fundingInstrument: configuration.fundingInstrument,
          id: configuration.fundingCallId,
          maximumGrantAmount: configuration.maximumGrantAmount,
          minimumGrantAmount: configuration.minimumGrantAmount,
          opensAt: configuration.opensAt,
          slug: configuration.slug,
          status: configuration.status,
          thematicArea: configuration.thematicArea,
          title: configuration.title,
          totalBudgetEnvelope: configuration.totalBudgetEnvelope,
        },
      },
    );
    return writeApplicationSubmission(transaction, {
      ...input,
      application,
      configuration,
      eligibilityOutcome,
    });
  } catch (error) {
    if (error instanceof AuthoritativeEligibilityUnavailableError) {
      return { kind: "eligibility_unavailable" };
    }
    throw error;
  }
}

type SubmitApplicationInput = {
  actorId: string;
  applicationId: string;
  correlationId: string;
  idempotencyKey: string;
  requiredDocumentTypes: ApplicationDocumentType[];
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
