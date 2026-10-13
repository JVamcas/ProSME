import "server-only";

import { and, asc, desc, eq, inArray } from "drizzle-orm";

import type { FormRuntimeSchema } from "@/modules/forms/FormTypes";
import {
  formSections,
  formVersions,
} from "@/modules/forms/infrastructure/form.schema";
import { readFormFields } from "@/modules/forms/infrastructure/FormRepository";
import { evaluateApplicationReadiness } from "../domain/ApplicationReadiness";
import { applicationResponseValues } from "../domain/ApplicationDocumentPolicy";
import {
  attachBusinessFieldsToForm,
  fillMissingAttachedBusinessValues,
  needsAttachedBusinessValues,
} from "../domain/AttachedApplicationForm";
import { readApplicationBusinessInTransaction } from "./ApplicationBusinessContextRepository";
import { applicationDocumentVersions } from "./application-document.schema";
import type { ApplicationTransaction } from "./ApplicationCommandRepository";
import {
  applicationDraftResponses,
  type ApplicationRecord,
} from "./application.schema";

async function readBoundForm(
  transaction: ApplicationTransaction,
  versionId: string,
): Promise<FormRuntimeSchema | null> {
  const [version] = await transaction
    .select()
    .from(formVersions)
    .where(
      and(
        eq(formVersions.id, versionId),
        inArray(formVersions.status, ["PUBLISHED", "RETIRED"]),
      ),
    )
    .limit(1);
  if (!version) return null;
  const [sections, fields] = await Promise.all([
    transaction
      .select({
        columnSpan: formSections.columnSpan,
        description: formSections.description,
        id: formSections.id,
        key: formSections.key,
        order: formSections.order,
        showContainer: formSections.showContainer,
        title: formSections.title,
        visibilityCondition: formSections.visibilityCondition,
      })
      .from(formSections)
      .where(eq(formSections.formVersionId, versionId))
      .orderBy(asc(formSections.order)),
    readFormFields(versionId, transaction),
  ]);
  return {
    displayMode: version.displayMode,
    fields,
    instructions: version.instructions,
    sections,
    submissionMode: version.submissionMode,
    submitLabel: version.submitLabel,
    versionId: version.id,
    versionNumber: version.versionNumber,
  };
}

export async function readTransactionalApplicationReadiness(
  transaction: ApplicationTransaction,
  application: ApplicationRecord & { formVersionId: string },
  callOpen: boolean,
  configurationAvailable: boolean,
  evaluatedAt: Date,
) {
  const [response] = await transaction
    .select({
      formVersionId: applicationDraftResponses.formVersionId,
      rowVersion: applicationDraftResponses.rowVersion,
      values: applicationDraftResponses.values,
    })
    .from(applicationDraftResponses)
    .where(
      and(
        eq(applicationDraftResponses.id, application.latestDraftResponseId!),
        eq(applicationDraftResponses.applicationId, application.id),
        eq(applicationDraftResponses.respondentUserId, application.ownerUserId),
      ),
    )
    .limit(1);
  const boundForm = await readBoundForm(transaction, application.formVersionId);
  if (!response || !boundForm) return null;
  const form = configurationAvailable
    ? attachBusinessFieldsToForm(boundForm, application.fundingOpportunityId)
    : boundForm;
  if (
    configurationAvailable &&
    application.businessId &&
    needsAttachedBusinessValues(response.values)
  ) {
    const business = await readApplicationBusinessInTransaction(
      transaction,
      application.ownerUserId,
      application.businessId,
    );
    if (business) {
      response.values = fillMissingAttachedBusinessValues(
        response.values,
        business,
      );
    }
  }
  response.values = applicationResponseValues(form, response.values);
  const documentRows = await transaction
    .selectDistinctOn([applicationDocumentVersions.requirementKey], {
      checksumSha256: applicationDocumentVersions.checksumSha256,
      contentType: applicationDocumentVersions.contentType,
      fileName: applicationDocumentVersions.originalName,
      id: applicationDocumentVersions.id,
      objectKey: applicationDocumentVersions.objectKey,
      originalName: applicationDocumentVersions.originalName,
      requirementKey: applicationDocumentVersions.requirementKey,
      sizeBytes: applicationDocumentVersions.sizeBytes,
      storageStatus: applicationDocumentVersions.storageStatus,
      uploadedAt: applicationDocumentVersions.uploadedAt,
      versionId: applicationDocumentVersions.id,
      versionNumber: applicationDocumentVersions.versionNumber,
    })
    .from(applicationDocumentVersions)
    .where(
      and(
        eq(applicationDocumentVersions.applicationId, application.id),
        eq(applicationDocumentVersions.ownerUserId, application.ownerUserId),
      ),
    )
    .orderBy(
      applicationDocumentVersions.requirementKey,
      desc(applicationDocumentVersions.versionNumber),
    );
  const readiness = evaluateApplicationReadiness({
    application: {
      businessId: application.businessId,
      formVersionId: application.formVersionId,
      rowVersion: application.rowVersion,
      status: application.status,
    },
    callOpen,
    configurationAvailable,
    documents: documentRows.map((document) => ({
      ...document,
      uploadedAt: document.uploadedAt.toISOString(),
    })),
    evaluatedAt,
    form,
    response,
  });
  return { documents: documentRows, form, readiness, response };
}
