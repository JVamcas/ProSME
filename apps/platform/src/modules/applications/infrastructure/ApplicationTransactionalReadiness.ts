import "server-only";

import { and, asc, desc, eq, inArray } from "drizzle-orm";

import type { FormField, FormRuntimeSchema } from "@/modules/forms/FormTypes";
import {
  formFieldOptions,
  formFields,
  formSections,
  formVersions,
} from "@/modules/forms/infrastructure/form.schema";
import { evaluateApplicationReadiness } from "../domain/ApplicationReadiness";
import { applicationResponseValues } from "../domain/ApplicationDocumentPolicy";
import {
  attachBusinessFieldsToForm,
  fillMissingAttachedBusinessValues,
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
    .where(and(
      eq(formVersions.id, versionId),
      inArray(formVersions.status, ["PUBLISHED", "RETIRED"]),
    ))
    .limit(1);
  if (!version) return null;
  const sections = await transaction
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
    .orderBy(asc(formSections.order));
  const fieldRows = await transaction
    .select({
      columnSpan: formFields.columnSpan,
      helpText: formFields.helpText,
      id: formFields.id,
      key: formFields.key,
      label: formFields.label,
      maximum: formFields.maximum,
      maxLength: formFields.maxLength,
      minimum: formFields.minimum,
      minLength: formFields.minLength,
      order: formFields.order,
      required: formFields.required,
      sectionId: formFields.sectionId,
      type: formFields.type,
      visibilityCondition: formFields.visibilityCondition,
    })
    .from(formFields)
    .innerJoin(formSections, eq(formSections.id, formFields.sectionId))
    .where(eq(formFields.formVersionId, versionId))
    .orderBy(asc(formSections.order), asc(formFields.order));
  const options = await transaction
    .select({
      fieldId: formFieldOptions.fieldId,
      key: formFieldOptions.key,
      label: formFieldOptions.label,
      order: formFieldOptions.order,
    })
    .from(formFieldOptions)
    .innerJoin(formFields, eq(formFields.id, formFieldOptions.fieldId))
    .where(eq(formFields.formVersionId, versionId))
    .orderBy(asc(formFieldOptions.order));
  const optionsByField = Map.groupBy(options, (option) => option.fieldId);
  const fields: FormField[] = fieldRows.map((field) => ({
    ...field,
    maximum: field.maximum ?? undefined,
    maxLength: field.maxLength ?? undefined,
    minimum: field.minimum ?? undefined,
    minLength: field.minLength ?? undefined,
    options: optionsByField.get(field.id)?.map((option) => ({
      key: option.key,
      label: option.label,
      order: option.order,
    })) ?? [],
  }));
  return {
    displayMode: version.displayMode,
    fields,
    instructions: version.instructions,
    sections,
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
    .where(and(
      eq(applicationDraftResponses.id, application.latestDraftResponseId!),
      eq(applicationDraftResponses.applicationId, application.id),
      eq(applicationDraftResponses.respondentUserId, application.ownerUserId),
    ))
    .limit(1);
  const boundForm = await readBoundForm(transaction, application.formVersionId);
  if (!response || !boundForm) return null;
  const form = configurationAvailable
    ? attachBusinessFieldsToForm(
        boundForm,
        application.fundingOpportunityId,
      )
    : boundForm;
  if (
    configurationAvailable
    && application.businessId
    && !Object.hasOwn(response.values, "BUSINESS_LEGAL_NAME")
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
    .where(and(
      eq(applicationDocumentVersions.applicationId, application.id),
      eq(applicationDocumentVersions.ownerUserId, application.ownerUserId),
    ))
    .orderBy(
      applicationDocumentVersions.requirementKey,
      desc(applicationDocumentVersions.versionNumber),
    );
  const readiness = evaluateApplicationReadiness({
    application: {
      businessId: application.businessId,
      declarationAcceptance: application.declarationAcceptance,
      declarationsSection: application.declarationsSection,
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
