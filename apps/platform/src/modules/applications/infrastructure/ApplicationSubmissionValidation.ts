import "server-only";

import { createHash } from "node:crypto";
import { and, desc, eq, isNull, ne } from "drizzle-orm";

import type { DatabaseTransaction } from "@/db/client";
import {
  applicantProfiles,
  applications,
  businessProfiles,
  fundingCallPublicationRevisions,
  fundingCalls,
  users,
  workflowDefinitionVersions,
  workflowStageDefinitions,
} from "@/db/schema";
import type { ApplicationReadinessBlocker } from "../domain/ApplicationReadiness";
import { isFundingCallEffectivelyOpen } from "@/modules/funding-calls/domain/FundingCallLifecycle";
import {
  findRuntimeEligibilityRuleSetForEvaluation,
  InvalidEligibilityEvaluationRuleSetError,
} from "@/modules/eligibility/infrastructure/EligibilityEvaluationRepository";
import { readTransactionalApplicationReadiness } from "./ApplicationTransactionalReadiness";

type ValidationInput = {
  actorId: string;
  applicationId: string;
  lockApplication: boolean;
  now: Date;
};

function fingerprint(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function blocker(
  category: ApplicationReadinessBlocker["category"],
  code: string,
  message: string,
): ApplicationReadinessBlocker {
  return { category, code, message };
}

async function readApplication(
  transaction: DatabaseTransaction,
  input: ValidationInput,
) {
  const query = transaction
    .select()
    .from(applications)
    .where(and(
      eq(applications.id, input.applicationId),
      eq(applications.ownerUserId, input.actorId),
      isNull(applications.deletedAt),
    ));
  const rows = input.lockApplication
    ? await query.for("update").limit(1)
    : await query.limit(1);
  return rows[0] ?? null;
}

async function hasDuplicateSubmission(
  transaction: DatabaseTransaction,
  application: typeof applications.$inferSelect,
) {
  if (application.duplicatePolicy === "none") return false;
  const duplicateScope = application.duplicatePolicy === "one_per_applicant"
    ? eq(applications.ownerUserId, application.ownerUserId)
    : application.businessId
      ? eq(applications.businessId, application.businessId)
      : undefined;
  if (!duplicateScope) return false;
  const [duplicate] = await transaction
    .select({ id: applications.id })
    .from(applications)
    .where(and(
      ne(applications.id, application.id),
      eq(applications.fundingOpportunityId, application.fundingOpportunityId),
      eq(applications.status, "submitted"),
      duplicateScope,
    ))
    .limit(1);
  return Boolean(duplicate);
}

async function eligibilityServiceAvailable(
  transaction: DatabaseTransaction,
  versionId: string | null,
) {
  if (!versionId) return false;
  try {
    return Boolean(await findRuntimeEligibilityRuleSetForEvaluation(
      versionId,
      transaction,
    ));
  } catch (error) {
    if (error instanceof InvalidEligibilityEvaluationRuleSetError) return false;
    throw error;
  }
}

export async function validateApplicationSubmissionState(
  transaction: DatabaseTransaction,
  input: ValidationInput,
) {
  const application = await readApplication(transaction, input);
  if (!application) return null;
  const [
    businessRows,
    callRows,
    applicantRows,
    publicationRows,
    duplicate,
  ] = await Promise.all([
    application.businessId
      ? transaction.select().from(businessProfiles).where(and(
          eq(businessProfiles.id, application.businessId),
          eq(businessProfiles.userId, input.actorId),
        )).limit(1)
      : Promise.resolve([]),
    transaction.select().from(fundingCalls).where(
      eq(fundingCalls.id, application.fundingOpportunityId),
    ).limit(1),
    transaction
      .select({
        dateOfBirth: applicantProfiles.dateOfBirth,
        displayName: users.displayName,
        email: users.email,
        firstName: applicantProfiles.firstName,
        nationality: applicantProfiles.nationality,
        phoneNumber: applicantProfiles.phoneNumber,
        position: applicantProfiles.position,
        postalAddress: applicantProfiles.postalAddress,
        profileUpdatedAt: applicantProfiles.updatedAt,
        region: applicantProfiles.region,
        surname: applicantProfiles.surname,
        userId: users.id,
      })
      .from(users)
      .leftJoin(applicantProfiles, eq(applicantProfiles.userId, users.id))
      .where(eq(users.id, application.ownerUserId))
      .limit(1),
    transaction
      .select({
        id: fundingCallPublicationRevisions.id,
        publishedAt: fundingCallPublicationRevisions.publishedAt,
        revisionNumber: fundingCallPublicationRevisions.revisionNumber,
        snapshot: fundingCallPublicationRevisions.snapshot,
        sourceRowVersion: fundingCallPublicationRevisions.sourceRowVersion,
      })
      .from(fundingCallPublicationRevisions)
      .where(eq(
        fundingCallPublicationRevisions.fundingCallId,
        application.fundingOpportunityId,
      ))
      .orderBy(desc(fundingCallPublicationRevisions.revisionNumber))
      .limit(1),
    hasDuplicateSubmission(transaction, application),
  ]);
  const business = businessRows[0] ?? null;
  const fundingCall = callRows[0] ?? null;
  const applicant = applicantRows[0] ?? null;
  const publicationRevision = publicationRows[0] ?? null;
  const workflowRows = fundingCall?.workflowTemplateVersionId
    ? await transaction
        .select({
          stageId: workflowStageDefinitions.id,
          versionId: workflowDefinitionVersions.id,
        })
        .from(workflowDefinitionVersions)
        .innerJoin(
          workflowStageDefinitions,
          and(
            eq(
              workflowStageDefinitions.versionId,
              workflowDefinitionVersions.id,
            ),
            eq(workflowStageDefinitions.initial, true),
            eq(workflowStageDefinitions.enabled, true),
          ),
        )
        .where(and(
          eq(
            workflowDefinitionVersions.id,
            fundingCall.workflowTemplateVersionId,
          ),
          eq(workflowDefinitionVersions.status, "PUBLISHED"),
        ))
        .limit(2)
    : [];
  const workflowAvailable = workflowRows.length === 1;
  const eligibilityAvailable = await eligibilityServiceAvailable(
    transaction,
    application.eligibilityRuleSetVersionId,
  );
  const callOpen = fundingCall
    ? isFundingCallEffectivelyOpen(fundingCall, input.now)
    : false;
  const exactConfiguration = Boolean(
    fundingCall
    && applicant
    && publicationRevision
    && application.formVersionId
    && application.formVersionId === fundingCall.formVersionId
    && application.eligibilityRuleSetVersionId
    && application.eligibilityRuleSetVersionId
      === fundingCall.eligibilityRuleSetVersionId
    && application.duplicatePolicy === fundingCall.applicationDuplicatePolicy
    && workflowAvailable
    && eligibilityAvailable,
  );
  const context = application.formVersionId
    ? await readTransactionalApplicationReadiness(
        transaction,
        { ...application, formVersionId: application.formVersionId },
        callOpen,
        exactConfiguration,
        input.now,
      )
    : null;
  const blockers = context?.readiness.blockers.slice() ?? [
    blocker(
      "configuration",
      "CONFIGURATION_UNAVAILABLE",
      "A required application configuration is unavailable.",
    ),
  ];
  if (application.businessId && !business) {
    blockers.push(blocker(
      "authority",
      "REPRESENTATIVE_AUTHORITY_REQUIRED",
      "You are not authorized to submit for the selected business.",
    ));
  }
  if (duplicate) {
    blockers.push(blocker(
      "duplicate",
      "DUPLICATE_SUBMISSION",
      "A submission already exists for this Funding Call under its application limit.",
    ));
  }
  if (!workflowAvailable) {
    blockers.push(blocker(
      "workflow",
      "INITIAL_WORKFLOW_STAGE_UNAVAILABLE",
      "The submission workflow is unavailable.",
    ));
  }
  if (!eligibilityAvailable) {
    blockers.push(blocker(
      "service",
      "ELIGIBILITY_SERVICE_UNAVAILABLE",
      "Eligibility validation is temporarily unavailable.",
    ));
  }
  const readiness = context
    ? { ...context.readiness, blockers, ready: blockers.length === 0 }
    : null;
  const configurationFingerprint = fingerprint({
    duplicatePolicy: fundingCall?.applicationDuplicatePolicy ?? null,
    eligibilityRuleSetVersionId: fundingCall?.eligibilityRuleSetVersionId ?? null,
    formVersionId: fundingCall?.formVersionId ?? null,
    fundingCallRowVersion: fundingCall?.rowVersion ?? null,
    initialStageId: workflowRows[0]?.stageId ?? null,
    workflowTemplateVersionId: fundingCall?.workflowTemplateVersionId ?? null,
  });
  const documentFingerprint = fingerprint(
    context?.documents.map((document) => ({
      id: document.id,
      requirementKey: document.requirementKey,
      storageStatus: document.storageStatus,
      versionNumber: document.versionNumber,
    })) ?? [],
  );
  return {
    applicant,
    application,
    business,
    configuration: fundingCall && workflowRows[0]
      ? {
          ...fundingCall,
          stageId: workflowRows[0].stageId,
          workflowTemplateVersionId: workflowRows[0].versionId,
        }
      : null,
    configurationFingerprint,
    context,
    documentFingerprint,
    publicationRevision,
    readiness,
  };
}
