import "server-only";

import { inArray } from "drizzle-orm";

import { getDatabase } from "@/db/client";
import {
  formDefinitions,
  formFieldOptions,
  formFields,
  formSections,
  formVersions,
} from "@/db/schema";
import type { StandardFormSeed } from "@/modules/forms/domain/StandardFormDefinition";
import {
  ensureSystemSeedPrincipal,
  systemSeedUserId,
} from "@/platform/database/SystemSeedPrincipal";

export type StandardFormSeedResult = {
  createdCodes: string[];
  skippedCodes: string[];
};

export async function insertMissingStandardForms(
  forms: StandardFormSeed[],
): Promise<StandardFormSeedResult> {
  return getDatabase().transaction(async (transaction) => {
    const requestedCodes = forms.map((form) => form.code);
    const existing = await transaction
      .select({ code: formDefinitions.code })
      .from(formDefinitions)
      .where(inArray(formDefinitions.code, requestedCodes));
    const existingCodes = new Set(existing.map((item) => item.code));
    const missing = forms.filter((form) => !existingCodes.has(form.code));
    const skippedCodes = forms
      .filter((form) => existingCodes.has(form.code))
      .map((form) => form.code);

    if (!missing.length) {
      return { createdCodes: [], skippedCodes };
    }

    await ensureSystemSeedPrincipal(transaction);

    const records = missing.map((form) => ({
      definitionId: crypto.randomUUID(),
      form,
      versionId: crypto.randomUUID(),
    }));

    await transaction.insert(formDefinitions).values(
      records.map(({ definitionId, form }) => ({
        code: form.code,
        createdBy: systemSeedUserId,
        description: form.description,
        id: definitionId,
        name: form.name,
      })),
    );
    await transaction.insert(formVersions).values(
      records.map(({ definitionId, form, versionId }) => ({
        createdBy: systemSeedUserId,
        displayMode: form.displayMode ?? "SINGLE_PAGE",
        formDefinitionId: definitionId,
        id: versionId,
        instructions: form.instructions,
        status: "DRAFT" as const,
        submitLabel: form.submitLabel,
        versionNumber: 1,
      })),
    );

    await transaction.insert(formSections).values(
      records.flatMap(({ form, versionId }) => form.sections.map((section) => ({
        columnSpan: section.columnSpan,
        description: section.description,
        formVersionId: versionId,
        id: section.id!,
        key: section.key,
        order: section.order,
        showContainer: section.showContainer,
        visibilityCondition: section.visibilityCondition ?? null,
        title: section.title,
      }))),
    );

    const seededFields = records.flatMap(({ form, versionId }) => (
      form.fields.map((field) => ({
        field,
        fieldId: crypto.randomUUID(),
        versionId,
      }))
    ));
    await transaction.insert(formFields).values(
      seededFields.map(({ field, fieldId, versionId }) => ({
        columnSpan: field.columnSpan,
        formVersionId: versionId,
        helpText: field.helpText ?? null,
        id: fieldId,
        key: field.key,
        label: field.label,
        maximum: field.maximum ?? null,
        maxLength: field.maxLength ?? null,
        minimum: field.minimum ?? null,
        minLength: field.minLength ?? null,
        order: field.order,
        required: field.required,
        sectionId: field.sectionId,
        type: field.type,
        visibilityCondition: field.visibilityCondition ?? null,
      })),
    );

    const seededOptions = seededFields.flatMap(({ field, fieldId }) => (
      (field.options ?? []).map((option) => ({
        fieldId,
        key: option.key,
        label: option.label,
        order: option.order,
      }))
    ));
    if (seededOptions.length) {
      await transaction.insert(formFieldOptions).values(seededOptions);
    }

    const publishedVersionIds = records
      .filter(({ form }) => form.publishOnSeed)
      .map(({ versionId }) => versionId);
    if (publishedVersionIds.length) {
      const publishedAt = new Date();
      await transaction
        .update(formVersions)
        .set({
          publishedAt,
          publishedBy: systemSeedUserId,
          rowVersion: 2,
          status: "PUBLISHED",
          updatedAt: publishedAt,
        })
        .where(inArray(formVersions.id, publishedVersionIds));
    }

    return {
      createdCodes: missing.map((form) => form.code),
      skippedCodes,
    };
  });
}
