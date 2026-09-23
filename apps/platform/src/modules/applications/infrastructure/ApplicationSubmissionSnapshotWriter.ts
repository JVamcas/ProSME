import "server-only";

import { applicationSubmissionSnapshots } from "@/db/schema";
import {
  APPLICATION_SUBMISSION_SNAPSHOT_SCHEMA_VERSION,
  serializeSubmissionSnapshot,
  type ApplicationSubmissionSnapshotContent,
} from "../domain/ApplicationSubmissionSnapshot";
import type { SubmissionTransaction } from "./ApplicationSubmissionRepository";
import type { SubmissionWriteInput } from "./ApplicationSubmissionWriter";

export async function createSubmissionSnapshot(
  transaction: SubmissionTransaction,
  input: SubmissionWriteInput,
  reference: string,
  submittedAt: Date,
) {
  const documentVersions = input.context.documents
    .map((document) => ({
      checksumSha256: document.checksumSha256,
      contentType: document.contentType,
      id: document.id,
      objectKey: document.objectKey,
      originalName: document.originalName,
      requirementKey: document.requirementKey,
      sizeBytes: document.sizeBytes,
      versionNumber: document.versionNumber,
    }))
    .sort((left, right) => (
      left.requirementKey.localeCompare(right.requirementKey)
      || left.id.localeCompare(right.id)
    ));
  const snapshotContent: ApplicationSubmissionSnapshotContent = {
    applicant: {
      dateOfBirth: input.applicant.dateOfBirth,
      displayName: input.applicant.displayName,
      email: input.applicant.email,
      firstName: input.applicant.firstName,
      nationality: input.applicant.nationality,
      phoneNumber: input.applicant.phoneNumber,
      position: input.applicant.position,
      postalAddress: input.applicant.postalAddress,
      profileUpdatedAt: input.applicant.profileUpdatedAt?.toISOString() ?? null,
      region: input.applicant.region,
      surname: input.applicant.surname,
      userId: input.applicant.userId,
    },
    application: {
      businessId: input.application.businessId,
      businessSection: input.application.businessSection,
      declarationsSection: input.application.declarationsSection,
      financialSection: input.application.financialSection,
      fundingOpportunityId: input.application.fundingOpportunityId,
      ownerUserId: input.application.ownerUserId,
      projectSection: input.application.projectSection,
      reference,
      rowVersion: input.application.rowVersion,
      sectionCompletion: input.application.sectionCompletion,
      status: "submitted",
    },
    business: {
      businessType: input.business.businessType,
      employeeCount: input.business.employeeCount,
      establishedYear: input.business.establishedYear,
      id: input.business.id,
      legalName: input.business.legalName,
      physicalAddress: input.business.physicalAddress,
      region: input.business.region,
      registrationNumber: input.business.registrationNumber,
      sector: input.business.sector,
      tradingName: input.business.tradingName,
      updatedAt: input.business.updatedAt.toISOString(),
    },
    declarations: {
      acceptance: input.application.declarationAcceptance ?? {},
      values: input.application.declarationsSection,
    },
    documents: documentVersions,
    eligibilityRuleSetVersionId: input.application.eligibilityRuleSetVersionId!,
    form: {
      normalizedValues: input.context.response.values,
      responseRowVersion: input.context.response.rowVersion,
      versionId: input.application.formVersionId!,
    },
    fundingCall: {
      id: input.configuration.id,
      publicationRevisionId: input.publicationRevision.id,
      publicationRevisionNumber: input.publicationRevision.revisionNumber,
      publishedAt: input.publicationRevision.publishedAt.toISOString(),
      sourceRowVersion: input.publicationRevision.sourceRowVersion,
      statusAtSubmission: input.configuration.status,
      terms: input.publicationRevision.snapshot,
    },
    reference,
    schemaVersion: APPLICATION_SUBMISSION_SNAPSHOT_SCHEMA_VERSION,
    submittedAt: submittedAt.toISOString(),
    workflowTemplateVersionId: input.configuration.workflowTemplateVersionId,
  };
  const serialized = serializeSubmissionSnapshot(snapshotContent);
  const [snapshot] = await transaction
    .insert(applicationSubmissionSnapshots)
    .values({
      ...serialized,
      applicationData: {
        businessSection: input.application.businessSection,
        declarationsSection: input.application.declarationsSection,
        financialSection: input.application.financialSection,
        fundingOpportunityId: input.application.fundingOpportunityId,
        fundingOpportunityTitle: input.application.fundingOpportunityTitle,
        ownerUserId: input.application.ownerUserId,
        projectSection: input.application.projectSection,
      },
      applicationId: input.application.id,
      applicationRowVersion: input.application.rowVersion,
      businessData: snapshotContent.business,
      declarationAcceptance: input.application.declarationAcceptance ?? {},
      documentVersions,
      eligibilityRuleSetVersionId:
        input.application.eligibilityRuleSetVersionId!,
      formVersionId: input.application.formVersionId!,
      normalizedFormValues: input.context.response.values,
      responseRowVersion: input.context.response.rowVersion,
      schemaVersion: APPLICATION_SUBMISSION_SNAPSHOT_SCHEMA_VERSION,
      submittedAt,
      workflowTemplateVersionId:
        input.configuration.workflowTemplateVersionId,
    })
    .returning({
      canonicalContent: applicationSubmissionSnapshots.canonicalContent,
      id: applicationSubmissionSnapshots.id,
      integrityHash: applicationSubmissionSnapshots.integrityHash,
      snapshotContent: applicationSubmissionSnapshots.snapshotContent,
    });
  return snapshot!;
}
